import { Profile, UpdateProfileInput, UploadAvatarResult } from "./types";
import bcrypt from 'bcrypt';
import AppDataSource from '../../../../../lib/database';

export interface ProfileRepository {
  findByUserId(userId: number): Promise<Profile | null>;
  findByPhoneNumber(phone: string): Promise<Profile | null>;
  updateProfile(userId: number, payload: UpdateProfileInput): Promise<Profile>;
  updateAvatar(userId: number, avatarUrl: string | null): Promise<void>;
  getPasswordHash(userId: number): Promise<string>;
  updatePassword(userId: number, newHash: string): Promise<void>;
  updateSecuritySettings(userId: number, payload: any): Promise<void>;
}

export interface StorageService {
  uploadAvatar(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
}

export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly storageService: StorageService
  ) {}

  async changePassword(userId: number, oldPass: string, newPass: string): Promise<void> {
    // 1. Lấy mật khẩu cũ từ DB
    const currentHash = await this.profileRepository.getPasswordHash(userId);
    
    // 2. So sánh mật khẩu cũ nhập vào với DB
    const isMatch = await bcrypt.compare(oldPass, currentHash);
    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không chính xác");
    }

    // 3. Mã hóa mật khẩu mới (8+ ký tự theo yêu cầu) 
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPass, salt);

    // 4. Lưu vào DB
    await this.profileRepository.updatePassword(userId, newHash);
  }

  async getProfile(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }
    return profile;
  }

  async updateProfile(userId: number, payload: UpdateProfileInput): Promise<Profile> {
    if (payload.phone_number) {
      const existed = await this.profileRepository.findByPhoneNumber(payload.phone_number);
      if (existed && existed.id !== userId) {
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }
    return this.profileRepository.updateProfile(userId, payload);
  }

  async uploadAvatar(
    userId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string }
  ): Promise<UploadAvatarResult> {
    const fileName = `avatars/${userId}-${Date.now()}-${file.originalname}`;
    const avatarUrl = await this.storageService.uploadAvatar(
      file.buffer,
      fileName,
      file.mimetype
    );
    await this.profileRepository.updateAvatar(userId, avatarUrl);
    return { avatar_url: avatarUrl };
  }

  async uploadCourseManagerDocument(
    userId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string }
  ): Promise<{ file_url: string }> {
    const fileName = `manager-docs/${userId}-${Date.now()}-${file.originalname}`;
    const fileUrl = await this.storageService.uploadAvatar(
      file.buffer,
      fileName,
      file.mimetype
    );
    return { file_url: fileUrl };
  }

  async deleteAvatar(userId: number): Promise<void> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }
    if (profile.avatar_url) {
      await this.storageService.deleteFile(profile.avatar_url).catch(() => null);
    }
    await this.profileRepository.updateAvatar(userId, null);
  }
  async updateSecurity(userId: number, payload: any): Promise<void> {
    await this.profileRepository.updateSecuritySettings(userId, payload);
  }

  private static cmvSchemaEnsured = false;

  private async ensureCourseManagerVerificationSchema(): Promise<void> {
    if (ProfileService.cmvSchemaEnsured) return;
    await AppDataSource.query(
      `
      CREATE TABLE IF NOT EXISTS course_manager_verifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        status ENUM('pending','verified','rejected','suspended') NOT NULL DEFAULT 'pending',
        application_note TEXT NULL,
        expertise_areas VARCHAR(500) NULL,
        years_experience INT NULL,
        organization_name VARCHAR(255) NULL,
        portfolio_url VARCHAR(500) NULL,
        certificate_links TEXT NULL,
        teaching_statement TEXT NULL,
        review_note TEXT NULL,
        reviewed_by BIGINT UNSIGNED NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_course_manager_verifications_user_id (user_id),
        KEY idx_course_manager_verifications_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
    );
    const ensureColumn = async (columnName: string, ddl: string) => {
      const exists = await AppDataSource.query(
        `
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'course_manager_verifications'
          AND COLUMN_NAME = ?
        LIMIT 1
        `,
        [columnName]
      );
      if (!Array.isArray(exists) || exists.length === 0) {
        await AppDataSource.query(
          `ALTER TABLE course_manager_verifications ADD COLUMN ${ddl}`
        );
      }
    };
    await ensureColumn("expertise_areas", "expertise_areas VARCHAR(500) NULL");
    await ensureColumn("years_experience", "years_experience INT NULL");
    await ensureColumn("organization_name", "organization_name VARCHAR(255) NULL");
    await ensureColumn("portfolio_url", "portfolio_url VARCHAR(500) NULL");
    await ensureColumn("certificate_links", "certificate_links TEXT NULL");
    await ensureColumn("teaching_statement", "teaching_statement TEXT NULL");
    ProfileService.cmvSchemaEnsured = true;
  }

  async getCourseManagerReadiness(userId: number): Promise<{
    status: 'pending' | 'verified' | 'rejected' | 'suspended' | 'not_applied';
    application: {
      expertise_areas: string | null;
      years_experience: number | null;
      organization_name: string | null;
      portfolio_url: string | null;
      certificate_links: string | null;
      teaching_statement: string | null;
      application_note: string | null;
    };
    review_note: string | null;
    reviewed_at: string | null;
    checklist: Array<{ key: string; label: string; ok: boolean; hint: string }>;
    can_submit: boolean;
  }> {
    await this.ensureCourseManagerVerificationSchema();
    const profile = await this.getProfile(userId);
    const roles = (profile.roles || []).map((r) => String(r).toLowerCase());
    if (!roles.includes('course_manager')) {
      throw new Error('Chỉ course_manager mới có thể nộp hồ sơ cấp phép.');
    }

    const rows = await AppDataSource.query(
      `
      SELECT status, application_note, expertise_areas, years_experience, organization_name, portfolio_url, certificate_links, teaching_statement, review_note, reviewed_at
      FROM course_manager_verifications
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    const applicationNote = row?.application_note ? String(row.application_note) : null;
    const expertiseAreas = row?.expertise_areas ? String(row.expertise_areas) : null;
    const yearsExperience = row?.years_experience != null ? Number(row.years_experience) : null;
    const organizationName = row?.organization_name ? String(row.organization_name) : null;
    const portfolioUrl = row?.portfolio_url ? String(row.portfolio_url) : null;
    const certificateLinks = row?.certificate_links ? String(row.certificate_links) : null;
    const teachingStatement = row?.teaching_statement ? String(row.teaching_statement) : null;
    const checklist = [
      {
        key: 'full_name',
        label: 'Họ tên đầy đủ',
        ok: String(profile.full_name || '').trim().length >= 5,
        hint: 'Cần tối thiểu 5 ký tự.',
      },
      {
        key: 'phone_number',
        label: 'Số điện thoại',
        ok: String(profile.phone_number || '').trim().length >= 10,
        hint: 'Cập nhật số điện thoại liên hệ hợp lệ.',
      },
      {
        key: 'bio',
        label: 'Mô tả kinh nghiệm (Bio)',
        ok: String(profile.bio || '').trim().length >= 50,
        hint: 'Cần tối thiểu 50 ký tự mô tả năng lực.',
      },
      {
        key: 'expertise_areas',
        label: 'Lĩnh vực chuyên môn',
        ok: String(expertiseAreas || '').trim().length >= 10,
        hint: 'Nêu rõ chuyên môn chính (>=10 ký tự).',
      },
      {
        key: 'years_experience',
        label: 'Số năm kinh nghiệm',
        ok: yearsExperience != null && yearsExperience >= 1,
        hint: 'Tối thiểu 1 năm kinh nghiệm.',
      },
      {
        key: 'organization_name',
        label: 'Đơn vị công tác',
        ok: String(organizationName || '').trim().length >= 2,
        hint: 'Bổ sung tên đơn vị/tổ chức.',
      },
      {
        key: 'portfolio_url',
        label: 'Portfolio / hồ sơ công khai',
        ok: /^https?:\/\//i.test(String(portfolioUrl || '').trim()),
        hint: 'Cần URL hợp lệ bắt đầu bằng http/https.',
      },
      {
        key: 'certificate_links',
        label: 'Chứng chỉ / minh chứng năng lực',
        ok: String(certificateLinks || '').trim().length >= 10,
        hint: 'Điền danh sách chứng chỉ hoặc link minh chứng.',
      },
      {
        key: 'teaching_statement',
        label: 'Cam kết chất lượng đào tạo',
        ok: String(teachingStatement || '').trim().length >= 40,
        hint: 'Mô tả cách đảm bảo chất lượng (>=40 ký tự).',
      },
    ];

    const canSubmit = checklist.every((x) => x.ok);
    const status = row?.status ? String(row.status) : 'not_applied';
    return {
      status: status as 'pending' | 'verified' | 'rejected' | 'suspended' | 'not_applied',
      application: {
        expertise_areas: expertiseAreas,
        years_experience: yearsExperience,
        organization_name: organizationName,
        portfolio_url: portfolioUrl,
        certificate_links: certificateLinks,
        teaching_statement: teachingStatement,
        application_note: applicationNote,
      },
      review_note: row?.review_note ? String(row.review_note) : null,
      reviewed_at: row?.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      checklist,
      can_submit: canSubmit,
    };
  }

  async submitCourseManagerApplication(
    userId: number,
    payload: {
      expertise_areas?: string;
      years_experience?: number;
      organization_name?: string;
      portfolio_url?: string;
      certificate_links?: string;
      teaching_statement?: string;
      application_note?: string;
    }
  ): Promise<void> {
    await this.ensureCourseManagerVerificationSchema();
    const expertiseAreas = String(payload.expertise_areas || '').trim();
    const yearsExperienceRaw = payload.years_experience;
    const yearsExperience =
      yearsExperienceRaw == null || String(yearsExperienceRaw).trim() === ''
        ? null
        : Number(yearsExperienceRaw);
    const organizationName = String(payload.organization_name || '').trim();
    const portfolioUrl = String(payload.portfolio_url || '').trim();
    const certificateLinks = String(payload.certificate_links || '').trim();
    const teachingStatement = String(payload.teaching_statement || '').trim();
    const applicationNote = String(payload.application_note || '').trim();

    const readiness = await this.getCourseManagerReadiness(userId);
    if (!['pending', 'rejected', 'not_applied'].includes(readiness.status)) {
      throw new Error('Trạng thái hồ sơ hiện tại không cho phép cập nhật.');
    }
    if (yearsExperience != null && (!Number.isFinite(yearsExperience) || yearsExperience < 0)) {
      throw new Error('Số năm kinh nghiệm không hợp lệ.');
    }
    if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) {
      throw new Error('Portfolio / hồ sơ công khai phải là URL bắt đầu bằng http/https.');
    }

    await AppDataSource.query(
      `
      INSERT INTO course_manager_verifications (
        user_id, status, application_note, expertise_areas, years_experience, organization_name, portfolio_url, certificate_links, teaching_statement, review_note, reviewed_by, reviewed_at
      )
      VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
      ON DUPLICATE KEY UPDATE
        status = 'pending',
        application_note = VALUES(application_note),
        expertise_areas = VALUES(expertise_areas),
        years_experience = VALUES(years_experience),
        organization_name = VALUES(organization_name),
        portfolio_url = VALUES(portfolio_url),
        certificate_links = VALUES(certificate_links),
        teaching_statement = VALUES(teaching_statement),
        review_note = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL
      `,
      [
        userId,
        applicationNote || null,
        expertiseAreas || null,
        yearsExperience,
        organizationName || null,
        portfolioUrl || null,
        certificateLinks || null,
        teachingStatement || null,
      ]
    );
  }
}
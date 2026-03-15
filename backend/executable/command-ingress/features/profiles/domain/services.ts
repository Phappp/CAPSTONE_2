import { Profile, UpdateProfileInput, UploadAvatarResult } from "./types";
import bcrypt from 'bcrypt';

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
}
import AppDataSource from '../../../../../lib/database';
import User from '../../../../../internal/model/user';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import AuditLog from '../../../../../internal/model/audit_log';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import {
  BulkUserActionRequest,
  ListAuditLogsQuery,
  ListUsersQuery,
  CreateOpenRouterKeyRequest,
  UpdateOpenRouterConfigRequest,
  UpdateOpenRouterKeyRequest,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class AdminUserService {
  private static readonly rateLimitStore = new Map<string, { count: number; windowStartMs: number }>();
  private static openRouterKeySchemaEnsured = false;

  private async ensureOpenRouterKeySchema(): Promise<void> {
    if (AdminUserService.openRouterKeySchemaEnsured) return;

    const hasStatus = await AppDataSource.query(
      `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'openrouter_keys'
        AND COLUMN_NAME = 'last_test_status'
      LIMIT 1
      `,
    );

    if (!Array.isArray(hasStatus) || hasStatus.length === 0) {
      await AppDataSource.query(
        `ALTER TABLE openrouter_keys ADD COLUMN last_test_status VARCHAR(50) NULL`,
      );
    }

    const hasMessage = await AppDataSource.query(
      `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'openrouter_keys'
        AND COLUMN_NAME = 'last_test_message'
      LIMIT 1
      `,
    );

    if (!Array.isArray(hasMessage) || hasMessage.length === 0) {
      await AppDataSource.query(
        `ALTER TABLE openrouter_keys ADD COLUMN last_test_message VARCHAR(255) NULL`,
      );
    }

    AdminUserService.openRouterKeySchemaEnsured = true;
  }

  private async assertAdmin(userId: number): Promise<void> {
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const roleRepo = AppDataSource.getRepository(Role);

    const userRoles = await userRoleRepo.find({
      where: { user_id: userId },
    });
    if (userRoles.length === 0) {
      throw new Error('Forbidden: user has no roles');
    }
    const roleIds = userRoles.map((ur) => ur.role_id);
    const roles = await roleRepo.findByIds(roleIds);
    const names = roles.map((r) => r.name.toLowerCase());

    const isAdmin = names.includes('admin');
    if (!isAdmin) {
      throw new Error('Forbidden: admin role required');
    }
  }

  private enforceRateLimit(params: {
    actorUserId: number;
    key: string;
    max: number;
    windowMs: number;
  }): void {
    const { actorUserId, key, max, windowMs } = params;
    const now = Date.now();
    const storeKey = `${actorUserId}:${key}`;
    const entry = AdminUserService.rateLimitStore.get(storeKey);
    if (!entry || now - entry.windowStartMs >= windowMs) {
      AdminUserService.rateLimitStore.set(storeKey, { count: 1, windowStartMs: now });
      return;
    }
    if (entry.count >= max) {
      throw new Error('Too many requests');
    }
    entry.count += 1;
    AdminUserService.rateLimitStore.set(storeKey, entry);
  }

  private async isTargetAdmin(userId: number): Promise<boolean> {
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const roleRepo = AppDataSource.getRepository(Role);
    const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
    if (userRoles.length === 0) return false;
    const roleIds = [...new Set(userRoles.map((ur) => ur.role_id))];
    const roles = await roleRepo.findByIds(roleIds);
    const names = roles.map((r) => r.name.toLowerCase());
    return names.includes('admin');
  }

  private getEncryptionKey(): Buffer {
    const base = process.env.OPENROUTER_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'mindbridge-openrouter-secret';
    return crypto.createHash('sha256').update(base).digest();
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(payload: string): string {
    const [ivHex, encryptedHex] = String(payload || '').split(':');
    if (!ivHex || !encryptedHex) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private async logAction(
    actorUserId: number,
    action: string,
    targetUserId: number | null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    try {
      const auditRepo = AppDataSource.getRepository(AuditLog);
      const record = auditRepo.create({
        actor_user_id: actorUserId,
        target_user_id: targetUserId,
        action,
        metadata,
      });
      await auditRepo.save(record);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      // Nếu bảng audit_logs chưa tồn tại thì bỏ qua, không chặn luồng nghiệp vụ.
      if (msg.includes('audit_logs') || msg.includes('audit_log')) {
        // eslint-disable-next-line no-console
        console.warn('[AdminUserService] audit_logs table missing, skip logging.');
        return;
      }
      throw err;
    }
  }

  async listUsers(
    actorUserId: number,
    query: ListUsersQuery,
  ): Promise<{
    users: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
    statistics: {
      total: number;
      learners: number;
      course_managers: number;
      admins: number;
      pending: number;
      banned: number;
    };
  }> {
    await this.assertAdmin(actorUserId);

    const userRepo = AppDataSource.getRepository(User);
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const roleRepo = AppDataSource.getRepository(Role);

    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 && query.limit <= 100 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = userRepo.createQueryBuilder('u');
    if (!query.includeDeleted && query.status !== 'deleted') {
      qb.where('u.deleted_at IS NULL');
    } else {
      qb.where('1=1');
    }

    if (query.search) {
      qb.andWhere(
        '(u.email LIKE :search OR u.full_name LIKE :search OR u.phone_number LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status && query.status !== 'all') {
      if (query.status === 'deleted') {
        qb.andWhere('u.deleted_at IS NOT NULL');
      }
      if (query.status === 'active') {
        qb.andWhere('u.is_active = :active', { active: true });
      } else if (query.status === 'banned') {
        qb.andWhere('u.is_active = :active', { active: false });
      } else if (query.status === 'pending') {
        qb.andWhere('u.email_verified_at IS NULL');
      }
    }

    if (query.joinedFrom) {
      qb.andWhere('u.created_at >= :from', { from: query.joinedFrom });
    }
    if (query.joinedTo) {
      qb.andWhere('u.created_at <= :to', { to: query.joinedTo });
    }

    if (query.role && query.role !== 'all') {
      const roleNameMap: Record<string, string[]> = {
        learner: ['learner'],
        course_manager: ['course_manager'],
        admin: ['admin'],
      };
      const names = roleNameMap[query.role] ?? [query.role];
      qb.innerJoin(UserRole, 'ur', 'ur.user_id = u.id')
        .innerJoin(Role, 'r', 'r.id = ur.role_id')
        .andWhere('r.name IN (:...names)', { names });
    }

    const [rows, total] = await qb
      .orderBy('u.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Load roles for returned users
    const userIds = rows.map((u) => u.id);
    let rolesByUserId: Record<number, string[]> = {};
    if (userIds.length > 0) {
      const userRoles = await userRoleRepo.find({
        where: userIds.map((id) => ({ user_id: id })),
      });
      const roleIds = [...new Set(userRoles.map((ur) => ur.role_id))];
      const roles = roleIds.length
        ? await roleRepo.findByIds(roleIds)
        : [];
      const roleMap = new Map(roles.map((r) => [r.id, r.name]));
      rolesByUserId = userRoles.reduce((acc, ur) => {
        const roleName = roleMap.get(ur.role_id);
        if (!roleName) return acc;
        if (!acc[ur.user_id]) acc[ur.user_id] = [];
        acc[ur.user_id].push(roleName);
        return acc;
      }, {} as Record<number, string[]>);
    }

    const users = rows.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      avatar_url: u.avatar_url,
      role: (rolesByUserId[u.id] && rolesByUserId[u.id][0]) || null,
      roles: rolesByUserId[u.id] ?? [],
      status: u.deleted_at ? 'deleted' : u.is_active ? 'active' : 'banned',
      email_verified: !!u.email_verified_at,
      last_login: u.last_login_at,
      created_at: u.created_at,
    }));

    const pages = Math.ceil(total / limit) || 1;

    // Statistics
    const totalCount = await userRepo.count({ where: { deleted_at: null } });

    const countByRoles = async (names: string[]): Promise<number> => {
      if (names.length === 0) return 0;
      const result = await userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin(Role, 'r', 'r.id = ur.role_id')
        .innerJoin(User, 'u', 'u.id = ur.user_id')
        .where('u.deleted_at IS NULL')
        .andWhere('r.name IN (:...names)', { names })
        .select('COUNT(DISTINCT ur.user_id)', 'cnt')
        .getRawOne<{ cnt: string }>();
      return Number(result?.cnt ?? 0);
    };

    const [learners, courseManagers, admins, pending, banned] = await Promise.all([
      countByRoles(['learner']),
      countByRoles(['course_manager']),
      countByRoles(['admin']),
      userRepo.count({
        where: {
          deleted_at: null,
          email_verified_at: null,
        },
      }),
      userRepo.count({
        where: {
          deleted_at: null,
          is_active: false,
        },
      }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
      statistics: {
        total: totalCount,
        learners,
        course_managers: courseManagers,
        admins,
        pending,
        banned,
      },
    };
  }

  async updateUserStatus(
    actorUserId: number,
    userId: number,
    payload: UpdateUserStatusRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }

    const beforeStatus = user.is_active ? 'active' : 'banned';

    if (payload.status === 'active') {
      user.is_active = true;
    } else if (payload.status === 'banned') {
      user.is_active = false;
    } else if (payload.status === 'pending') {
      user.is_active = true;
      user.email_verified_at = null;
    }

    await userRepo.save(user);

    await this.logAction(actorUserId, 'user_status_changed', user.id, {
      before: beforeStatus,
      after: payload.status,
      reason: payload.reason ?? null,
      ip_address: context?.ip ?? null,
    });
  }

  async updateUserRole(
    actorUserId: number,
    userId: number,
    payload: UpdateUserRoleRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const userRoleRepo = AppDataSource.getRepository(UserRole);

    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }
    // Hệ thống hiện chỉ có 3 roles: admin/learner/course_manager
    // Đổi role giữa learner/course_manager/admin vẫn cho phép admin thực hiện.

    const targetNames: string[] = [payload.role];

    let role = await roleRepo.findOne({
      where: targetNames.map((name) => ({ name })),
    });
    if (!role) {
      role = roleRepo.create({
        name: payload.role,
        description: 'Auto-created by admin user management',
      });
      await roleRepo.save(role);
    }

    const existingUserRoles = await userRoleRepo.find({
      where: { user_id: user.id },
    });
    const beforeRoles = existingUserRoles.map((ur) => ur.role_id);

    // Hệ thống chỉ dùng 1 role chính: admin / learner / course_manager.
    // Vì vậy khi đổi role, ta bỏ hết role cũ và gán duy nhất role mới.
    if (existingUserRoles.length > 0) {
      await userRoleRepo.delete({ user_id: user.id } as any);
    }

    const newUserRole = userRoleRepo.create({
      user_id: user.id,
      role_id: role.id,
      assigned_by: actorUserId,
    });
    await userRoleRepo.save(newUserRole);

    await this.logAction(actorUserId, 'user_role_changed', user.id, {
      before_role_ids: beforeRoles,
      target_role_id: role.id,
      ip_address: context?.ip ?? null,
    });
  }

  async bulkAction(
    actorUserId: number,
    payload: BulkUserActionRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    if (!payload.user_ids || payload.user_ids.length === 0) {
      return;
    }

    if (payload.action === 'set_role' && !payload.role) {
      throw new Error('role is required for set_role action');
    }

    const userRepo = AppDataSource.getRepository(User);

    if (payload.action === 'activate' || payload.action === 'deactivate') {
      const isActive = payload.action === 'activate';
      await userRepo
        .createQueryBuilder()
        .update(User)
        .set({ is_active: isActive })
        .where('id IN (:...ids)', { ids: payload.user_ids })
        .andWhere('deleted_at IS NULL')
        .execute();

      await this.logAction(actorUserId, 'user_bulk_update', null, {
        action: payload.action,
        user_ids: payload.user_ids,
        ip_address: context?.ip ?? null,
      });
      return;
    }

    if (payload.action === 'set_role' && payload.role) {
      const roleRepo = AppDataSource.getRepository(Role);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      const targetNames: string[] = [payload.role];

      let role = await roleRepo.findOne({
        where: targetNames.map((name) => ({ name })),
      });
      if (!role) {
        role = roleRepo.create({
          name: payload.role,
          description: 'Auto-created by admin bulk role assignment',
        });
        await roleRepo.save(role);
      }

      const userIds = payload.user_ids;

      // Hệ thống chỉ dùng một role chính cho mỗi user.
      // Bulk set_role sẽ:
      // 1. Xóa hết role hiện tại của các user trong danh sách
      // 2. Gán duy nhất role mới.
      if (userIds.length > 0) {
        await userRoleRepo
          .createQueryBuilder()
          .delete()
          .from(UserRole)
          .where('user_id IN (:...ids)', { ids: userIds })
          .execute();

        const newEntities: UserRole[] = userIds.map((uid) =>
          userRoleRepo.create({
            user_id: uid,
            role_id: role.id,
            assigned_by: actorUserId,
          }),
        );
        await userRoleRepo.save(newEntities);
      }

      await this.logAction(actorUserId, 'user_bulk_update', null, {
        action: payload.action,
        role_id: role.id,
        user_ids: payload.user_ids,
        ip_address: context?.ip ?? null,
      });
    }
  }

  async softDeleteUser(
    actorUserId: number,
    userId: number,
    context?: { ip?: string | null; reason?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }
    // Chặn tự xóa chính mình (an toàn tối thiểu)
    if (actorUserId === user.id) {
      throw new Error('Forbidden: cannot delete yourself');
    }

    user.deleted_at = new Date();
    await userRepo.save(user);

    await this.logAction(actorUserId, 'user_soft_deleted', user.id, {
      ip_address: context?.ip ?? null,
      reason: context?.reason ?? null,
    });
  }

  async resetPassword(
    actorUserId: number,
    userId: number,
    context?: { ip?: string | null },
  ): Promise<{ temp_password: string }> {
    await this.assertAdmin(actorUserId);
    this.enforceRateLimit({ actorUserId, key: 'reset_password', max: 5, windowMs: 60_000 });
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    user.password_hash = passwordHash;
    await userRepo.save(user);

    try {
      const { sendMail } = await import('../../../../../lib/mailer');
      await sendMail(
        user.email,
        'Đặt lại mật khẩu tài khoản',
        `Mật khẩu tạm thời của bạn là: ${tempPassword}. Vui lòng đăng nhập và đổi mật khẩu ngay.`,
      );
    } catch (e) {
      // ignore email errors; admin vẫn nhận được temp_password nếu cần
    }

    await this.logAction(actorUserId, 'user_reset_password', user.id, {
      ip_address: context?.ip ?? null,
    });

    return { temp_password: tempPassword };
  }

  async restoreUser(
    actorUserId: number,
    userId: number,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.deleted_at) {
      throw new Error('User not found');
    }
    // OK for admin

    user.deleted_at = null as any;
    await userRepo.save(user);
    await this.logAction(actorUserId, 'user_restored', user.id, {
      ip_address: context?.ip ?? null,
    });
  }

  async hardDeleteUser(
    actorUserId: number,
    userId: number,
    context?: { ip?: string | null },
  ): Promise<void> {
    // Hệ thống hiện chỉ có 3 roles: admin/learner/course_manager -> không hỗ trợ hard delete
    throw new Error('Forbidden: hard delete is disabled');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    await userRepo.delete({ id: user.id } as any);
    await this.logAction(actorUserId, 'user_hard_deleted', user.id, {
      ip_address: context?.ip ?? null,
    });
  }

  async listAuditLogs(
    actorUserId: number,
    query: ListAuditLogsQuery,
  ): Promise<{
    logs: Array<{
      id: number;
      actor_user_id: number;
      target_user_id: number | null;
      action: string;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }>;
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    await this.assertAdmin(actorUserId);
    const auditRepo = AppDataSource.getRepository(AuditLog);

    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = auditRepo.createQueryBuilder('a').where('1=1');
    if (query.actor_user_id) {
      qb.andWhere('a.actor_user_id = :actor', { actor: query.actor_user_id });
    }
    if (query.action) {
      qb.andWhere('a.action = :action', { action: query.action });
    }
    if (query.from) {
      qb.andWhere('a.created_at >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('a.created_at <= :to', { to: query.to });
    }

    const [rows, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const pages = Math.ceil(total / limit) || 1;
    return {
      logs: rows.map((r) => ({
        id: r.id,
        actor_user_id: r.actor_user_id,
        target_user_id: r.target_user_id,
        action: r.action,
        metadata: r.metadata,
        created_at: r.created_at,
      })),
      pagination: { total, page, limit, pages },
    };
  }

  async getOpenRouterConfig(actorUserId: number): Promise<{
    models: string[];
    default_model: string | null;
    keys: Array<{
      id: number;
      label: string | null;
      key_preview: string;
      is_active: boolean;
      cooldown_until: Date | null;
      error_count: number;
      last_used_at: Date | null;
      last_error_at: Date | null;
      is_available_now: boolean;
    }>;
    active_available_keys: number;
  }> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const settingsRepo = AppDataSource.getRepository(OpenRouterSetting);
    const keyRepo = AppDataSource.getRepository(OpenRouterKey);
    const current = await settingsRepo.findOne({ where: {} });
    const keys = await keyRepo.find({ order: { id: 'ASC' } });
    const now = new Date();
    const mappedKeys = keys.map((key) => {
      const decrypted = this.decrypt(key.key_encrypted);
      const keyPreview =
        decrypted.length <= 8 ? '********' : `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
      const isAvailableNow =
        key.is_active && (!key.cooldown_until || new Date(key.cooldown_until) <= now);
      return {
        id: key.id,
        label: key.label,
        key_preview: keyPreview,
        is_active: key.is_active,
        cooldown_until: key.cooldown_until,
        error_count: Number(key.error_count || 0),
        last_used_at: key.last_used_at,
        last_error_at: key.last_error_at,
        last_test_status: key.last_test_status ?? null,
        last_test_message: key.last_test_message ?? null,
        is_available_now: isAvailableNow,
      };
    });

    return {
      models: Array.isArray(current?.models) ? (current?.models as string[]) : [],
      default_model: current?.default_model ?? null,
      keys: mappedKeys,
      active_available_keys: mappedKeys.filter((k) => k.is_available_now).length,
    };
  }

  async updateOpenRouterConfig(
    actorUserId: number,
    payload: UpdateOpenRouterConfigRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const repo = AppDataSource.getRepository(OpenRouterSetting);
    let current = await repo.findOne({ where: {} });
    if (!current) {
      current = repo.create({
        api_key_encrypted: null,
        models: [],
        default_model: null,
        updated_by: actorUserId,
      });
    }

    if (payload.api_key !== undefined) {
      const key = String(payload.api_key || '').trim();
      current.api_key_encrypted = key ? this.encrypt(key) : current.api_key_encrypted;
    }
    if (payload.models !== undefined) {
      const normalized = (payload.models || [])
        .map((item) => String(item).trim())
        .filter(Boolean);
      current.models = normalized;
    }
    if (payload.default_model !== undefined) {
      const model = String(payload.default_model || '').trim();
      current.default_model = model || null;
    }
    current.updated_by = actorUserId;
    await repo.save(current);

    await this.logAction(actorUserId, 'openrouter_config_updated', null, {
      has_api_key: Boolean(current.api_key_encrypted),
      models_count: Array.isArray(current.models) ? current.models.length : 0,
      default_model: current.default_model ?? null,
      ip_address: context?.ip ?? null,
    });
  }

  async createOpenRouterKey(
    actorUserId: number,
    payload: CreateOpenRouterKeyRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const key = String(payload.api_key || '').trim();
    if (!key) throw new Error('OpenRouter API key không được rỗng.');
    const repo = AppDataSource.getRepository(OpenRouterKey);
    const created = repo.create({
      key_encrypted: this.encrypt(key),
      label: payload.label ? String(payload.label).trim() : null,
      is_active: true,
      cooldown_until: null,
      error_count: 0,
      last_used_at: null,
      last_error_at: null,
      last_test_status: null,
      last_test_message: null,
      created_by: actorUserId,
      updated_by: actorUserId,
    });
    await repo.save(created);
    await this.logAction(actorUserId, 'openrouter_key_created', null, {
      key_id: created.id,
      label: created.label,
      ip_address: context?.ip ?? null,
    });
  }

  async updateOpenRouterKey(
    actorUserId: number,
    keyId: number,
    payload: UpdateOpenRouterKeyRequest,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const repo = AppDataSource.getRepository(OpenRouterKey);
    const key = await repo.findOne({ where: { id: keyId } });
    if (!key) throw new Error('OpenRouter key not found.');

    if (payload.label !== undefined) key.label = String(payload.label || '').trim() || null;
    if (payload.is_active !== undefined) key.is_active = Boolean(payload.is_active);
    if (payload.clear_cooldown) key.cooldown_until = null;
    if (payload.cooldown_minutes !== undefined && Number(payload.cooldown_minutes) > 0) {
      key.cooldown_until = new Date(Date.now() + Number(payload.cooldown_minutes) * 60 * 1000);
      key.error_count = Number(key.error_count || 0) + 1;
      key.last_error_at = new Date();
    }
    key.updated_by = actorUserId;
    await repo.save(key);

    await this.logAction(actorUserId, 'openrouter_key_updated', null, {
      key_id: key.id,
      is_active: key.is_active,
      cooldown_until: key.cooldown_until,
      ip_address: context?.ip ?? null,
    });
  }

  async deleteOpenRouterKey(
    actorUserId: number,
    keyId: number,
    context?: { ip?: string | null },
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const repo = AppDataSource.getRepository(OpenRouterKey);
    const key = await repo.findOne({ where: { id: keyId } });
    if (!key) throw new Error('OpenRouter key not found.');
    await repo.delete({ id: keyId });

    await this.logAction(actorUserId, 'openrouter_key_deleted', null, {
      key_id: key.id,
      label: key.label,
      ip_address: context?.ip ?? null,
    });
  }

  async testOpenRouterKey(
    actorUserId: number,
    keyId: number,
    context?: { ip?: string | null },
  ): Promise<{
    ok: boolean;
    status: 'ok' | 'rate_limited' | 'unauthorized' | 'network_error' | 'unknown_error';
    message: string;
    cooldown_applied_minutes?: number;
  }> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const repo = AppDataSource.getRepository(OpenRouterKey);
    const key = await repo.findOne({ where: { id: keyId } });
    if (!key) throw new Error('OpenRouter key not found.');

    const plain = this.decrypt(key.key_encrypted);
    if (!plain) {
      return {
        ok: false,
        status: 'unknown_error',
        message: 'Không thể giải mã key.',
      };
    }

    const endpoint = 'https://openrouter.ai/api/v1/models';
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${plain}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        key.last_used_at = new Date();
        key.last_test_status = 'ok';
        key.last_test_message = 'Key hoạt động bình thường.';
        await repo.save(key);
        await this.logAction(actorUserId, 'openrouter_key_tested', null, {
          key_id: key.id,
          result: 'ok',
          ip_address: context?.ip ?? null,
        });
        return {
          ok: true,
          status: 'ok',
          message: 'Key hoạt động bình thường.',
        };
      }

      if (response.status === 401 || response.status === 403) {
        key.last_error_at = new Date();
        key.error_count = Number(key.error_count || 0) + 1;
        key.last_test_status = 'unauthorized';
        key.last_test_message = 'Key không hợp lệ hoặc không có quyền.';
        await repo.save(key);
        return {
          ok: false,
          status: 'unauthorized',
          message: 'Key không hợp lệ hoặc không có quyền.',
        };
      }

      if (response.status === 429) {
        const cooldownMinutes = 10;
        key.last_error_at = new Date();
        key.error_count = Number(key.error_count || 0) + 1;
        key.cooldown_until = new Date(Date.now() + cooldownMinutes * 60 * 1000);
        key.last_test_status = 'rate_limited';
        key.last_test_message = 'Key đang bị rate limit.';
        await repo.save(key);
        return {
          ok: false,
          status: 'rate_limited',
          message: 'Key đang bị rate limit, đã đưa vào cooldown 10 phút.',
          cooldown_applied_minutes: cooldownMinutes,
        };
      }

      key.last_error_at = new Date();
      key.error_count = Number(key.error_count || 0) + 1;
      key.last_test_status = 'unknown_error';
      key.last_test_message = `HTTP ${response.status}`;
      await repo.save(key);
      return {
        ok: false,
        status: 'unknown_error',
        message: `OpenRouter trả về HTTP ${response.status}.`,
      };
    } catch (error: any) {
      key.last_error_at = new Date();
      key.error_count = Number(key.error_count || 0) + 1;
      key.last_test_status = 'network_error';
      key.last_test_message = String(error?.message || error);
      await repo.save(key);
      return {
        ok: false,
        status: 'network_error',
        message: `Lỗi mạng khi test key: ${String(error?.message || error)}`,
      };
    }
  }

  async pickOpenRouterKeyForUsage(actorUserId: number): Promise<{ key: string; key_id: number }> {
    await this.assertAdmin(actorUserId);
    await this.ensureOpenRouterKeySchema();
    const repo = AppDataSource.getRepository(OpenRouterKey);
    const now = new Date();
    const candidates = await repo.find({
      where: { is_active: true },
      order: { last_used_at: 'ASC', id: 'ASC' },
    });
    const available = candidates.filter((item) => !item.cooldown_until || new Date(item.cooldown_until) <= now);
    if (!available.length) {
      throw new Error('Không còn OpenRouter key khả dụng (có thể tất cả đang cooldown).');
    }
    const picked = available[0];
    picked.last_used_at = now;
    await repo.save(picked);
    const plain = this.decrypt(picked.key_encrypted);
    return { key: plain, key_id: picked.id };
  }
}


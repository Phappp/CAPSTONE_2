import AppDataSource from '../../../../../lib/database';
import User from '../../../../../internal/model/user';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import AuditLog from '../../../../../internal/model/audit_log';
import {
  BulkUserActionRequest,
  ListUsersQuery,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '../types';
import bcrypt from 'bcryptjs';

export class AdminUserService {
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
    if (!names.includes('admin') && !names.includes('administrator')) {
      throw new Error('Forbidden: admin role required');
    }
  }

  private async logAction(
    actorUserId: number,
    action: string,
    targetUserId: number | null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    const record = auditRepo.create({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action,
      metadata,
    });
    await auditRepo.save(record);
  }

  async listUsers(
    actorUserId: number,
    query: ListUsersQuery,
  ): Promise<{
    users: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
    statistics: {
      total: number;
      students: number;
      instructors: number;
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

    const qb = userRepo
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL');

    if (query.search) {
      qb.andWhere(
        '(u.email LIKE :search OR u.full_name LIKE :search OR u.phone_number LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status && query.status !== 'all') {
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
        student: ['student', 'learner'],
        instructor: ['instructor', 'teacher', 'course_manager'],
        admin: ['admin', 'administrator'],
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
      status: u.is_active ? 'active' : 'banned',
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

    const [students, instructors, admins, pending, banned] = await Promise.all([
      countByRoles(['student', 'learner']),
      countByRoles(['instructor', 'teacher', 'course_manager']),
      countByRoles(['admin', 'administrator']),
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
        students,
        instructors,
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
    });
  }

  async updateUserRole(
    actorUserId: number,
    userId: number,
    payload: UpdateUserRoleRequest,
  ): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const userRoleRepo = AppDataSource.getRepository(UserRole);

    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }

    const normalizeMap: Record<string, string[]> = {
      student: ['student', 'learner'],
      instructor: ['instructor', 'teacher', 'course_manager'],
      admin: ['admin', 'administrator'],
    };
    const targetNames = normalizeMap[payload.role] ?? [payload.role];

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

    const keepRoleIds = existingUserRoles
      .map((ur) => ur.role_id)
      .filter((id) => id === role.id);
    if (keepRoleIds.length === 0) {
      const newUserRole = userRoleRepo.create({
        user_id: user.id,
        role_id: role.id,
        assigned_by: actorUserId,
      });
      await userRoleRepo.save(newUserRole);
    }

    await this.logAction(actorUserId, 'user_role_changed', user.id, {
      before_role_ids: beforeRoles,
      target_role_id: role.id,
    });
  }

  async bulkAction(
    actorUserId: number,
    payload: BulkUserActionRequest,
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
      });
      return;
    }

    if (payload.action === 'set_role' && payload.role) {
      const roleRepo = AppDataSource.getRepository(Role);
      const userRoleRepo = AppDataSource.getRepository(UserRole);

      const normalizeMap: Record<string, string[]> = {
        student: ['student', 'learner'],
        instructor: ['instructor', 'teacher', 'course_manager'],
        admin: ['admin', 'administrator'],
      };
      const targetNames = normalizeMap[payload.role] ?? [payload.role];

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
      const userRoles = await userRoleRepo.find({
        where: userIds.map((id) => ({ user_id: id, role_id: role.id })),
      });
      const existingPairs = new Set(userRoles.map((ur) => `${ur.user_id}-${ur.role_id}`));

      const newEntities: UserRole[] = [];
      for (const uid of userIds) {
        const key = `${uid}-${role.id}`;
        if (!existingPairs.has(key)) {
          const ent = userRoleRepo.create({
            user_id: uid,
            role_id: role.id,
            assigned_by: actorUserId,
          });
          newEntities.push(ent);
        }
      }
      if (newEntities.length > 0) {
        await userRoleRepo.save(newEntities);
      }

      await this.logAction(actorUserId, 'user_bulk_update', null, {
        action: payload.action,
        role_id: role.id,
        user_ids: payload.user_ids,
      });
    }
  }

  async softDeleteUser(actorUserId: number, userId: number): Promise<void> {
    await this.assertAdmin(actorUserId);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, deleted_at: null } });
    if (!user) {
      throw new Error('User not found');
    }

    user.deleted_at = new Date();
    await userRepo.save(user);

    await this.logAction(actorUserId, 'user_soft_deleted', user.id, null);
  }

  async resetPassword(
    actorUserId: number,
    userId: number,
  ): Promise<{ temp_password: string }> {
    await this.assertAdmin(actorUserId);
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

    await this.logAction(actorUserId, 'user_reset_password', user.id, null);

    return { temp_password: tempPassword };
  }
}


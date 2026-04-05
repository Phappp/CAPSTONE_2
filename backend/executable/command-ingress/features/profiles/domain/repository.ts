import { Profile, UpdateProfileInput } from "./types";
import { ProfileRepository } from "./services";
import AppDataSource from "../../../../../lib/database";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  created_at: Date | string;
};

type UserRoleRow = {
  role_name: string;
};

function getPrimaryRole(roles: string[]): string | null {
  if (!roles.length) return null;

  const priority = ["admin", "course_manager", "teacher", "learner", "student"];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }

  return roles[0] ?? null;
}

export class MysqlProfileRepository implements ProfileRepository {
  private async getUserRoles(userId: number): Promise<string[]> {
    const roleRows = (await AppDataSource.query(
      `
      SELECT r.name AS role_name
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      `,
      [userId]
    )) as UserRoleRow[];

    return roleRows
      .map((row) => String(row.role_name || "").trim().toLowerCase())
      .filter((name) => !!name)
      .filter((name, index, arr) => arr.indexOf(name) === index);
  }

  async findByUserId(userId: number): Promise<Profile | null> {
    const rows = (await AppDataSource.query(
      `
      SELECT 
        id,
        full_name,
        email,
        avatar_url,
        phone_number,
        bio,
        created_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId]
    )) as UserRow[];

    if (!rows.length) return null;

    const row = rows[0];
    const roles = await this.getUserRoles(userId);
    const primaryRole = getPrimaryRole(roles);

    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      avatar_url: row.avatar_url,
      phone_number: row.phone_number,
      bio: row.bio,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      roles,
      primary_role: primaryRole,
    };
  }
  

  async getPasswordHash(userId: number): Promise<string> {
    const rows = (await AppDataSource.query(
      `SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, // Thay 'password' bằng tên cột đúng
      [userId]
    )) as { password_hash: string }[];
  
    if (!rows.length) throw new Error("Không tìm thấy người dùng");
    return rows[0].password_hash;
  }

  async updatePassword(userId: number, newHash: string): Promise<void> {
    await AppDataSource.query(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, // Thay 'password' bằng tên cột đúng
      [newHash, userId]
    );
  }

  async findByPhoneNumber(phone: string): Promise<Profile | null> {
    const rows = (await AppDataSource.query(
      `
      SELECT 
        id,
        full_name,
        email,
        avatar_url,
        phone_number,
        bio,
        created_at
      FROM users
      WHERE phone_number = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [phone]
    )) as UserRow[];

    if (!rows.length) return null;

    const row = rows[0];
    const roles = await this.getUserRoles(row.id);
    const primaryRole = getPrimaryRole(roles);

    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      avatar_url: row.avatar_url,
      phone_number: row.phone_number,
      bio: row.bio,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      roles,
      primary_role: primaryRole,
    };
  }

  async updateProfile(userId: number, payload: UpdateProfileInput): Promise<Profile> {
    await AppDataSource.query(
      `
      UPDATE users
      SET
        full_name = ?,
        phone_number = ?,
        bio = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
      `,
      [
        payload.full_name,
        payload.phone_number ?? null,
        payload.bio ?? null,
        userId,
      ]
    );

    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }

    return profile;
  }

  async updateAvatar(userId: number, avatarUrl: string | null): Promise<void> {
    await AppDataSource.query(
      `
      UPDATE users
      SET
        avatar_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
      `,
      [avatarUrl, userId]
    );
  }
  async updateSecuritySettings(userId: number, payload: any): Promise<void> {
    const fields = [];
    const params = [];
  
    if (payload.is_2fa_enabled !== undefined) {
      fields.push("is_2fa_enabled = ?");
      params.push(payload.is_2fa_enabled ? 1 : 0);
    }
    if (payload.notify_new_login !== undefined) {
      fields.push("notify_new_login = ?");
      params.push(payload.notify_new_login ? 1 : 0);
    }
    if (payload.is_trusted_device !== undefined) {
      fields.push("is_trusted_device = ?");
      params.push(payload.is_trusted_device ? 1 : 0);
    }
  
    if (fields.length === 0) return;
  
    params.push(userId);
    await AppDataSource.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
  }
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entity: `audit_logs`
 * Ghi lại các hành động quản trị quan trọng (user management, v.v.).
 */
@Entity('audit_logs')
export default class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  /** Admin thực hiện hành động (FK -> users.id). */
  actor_user_id: number;

  @Column({ type: 'int', nullable: true })
  /** User bị tác động (FK -> users.id, nullable cho các hành động không gắn với 1 user cụ thể). */
  target_user_id: number | null;

  @Column({ type: 'varchar', length: 100 })
  /** Loại hành động, ví dụ: user_status_changed, user_role_changed, user_reset_password, user_bulk_update. */
  action: string;

  @Column({ type: 'json', nullable: true })
  /** Metadata chi tiết (before/after, lý do, danh sách user_ids, v.v.). */
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}


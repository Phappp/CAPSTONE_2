import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    PrimaryColumn,
    CreateDateColumn,
} from 'typeorm';
import User from './user';
import Role from './role';

/**
 * Entity: `user_roles`
 * Mục đích: Bảng liên kết N-N giữa `users` và `roles` (một user có thể có nhiều role).
 *
 * Khóa chính:
 * - (user_id, role_id): composite primary key.
 *
 * Cột chính:
 * - assigned_by: (nullable) ai gán role (admin/system)
 * - assigned_at: thời điểm gán
 */
@Entity('user_roles')
export default class UserRole {
    @PrimaryColumn()
    /** FK -> `users.id`: user được gán role. */
    user_id: number;

    @PrimaryColumn()
    /** FK -> `roles.id`: role được gán. */
    role_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    /** Quan hệ đến role. */
    role: Role;

    @Column({ type: 'int', nullable: true })
    /** FK -> `users.id` (nullable): người gán role. */
    assigned_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'assigned_by' })
    /** Quan hệ đến user gán role (nullable). */
    assignedBy: User;

    @CreateDateColumn({ type: 'timestamp'})
    /** Thời điểm gán role. */
    assigned_at: Date;
}
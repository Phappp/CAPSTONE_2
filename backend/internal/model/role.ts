import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

/**
 * Entity: `roles`
 * Mục đích: Danh mục role (quyền/nhóm người dùng) để phân quyền (kết hợp với `user_roles`).
 *
 * Cột chính:
 * - name: tên role (unique), ví dụ admin/instructor/student
 * - description: mô tả (nullable)
 * - created_at: thời điểm tạo
 */
@Entity('roles')
export default class Role {
    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    /** Tên role (duy nhất). */
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    /** Mô tả role (nullable). */
    description: string;

    /** Thời điểm tạo (dùng timestamp để tránh một số lỗi cấu hình MySQL). */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
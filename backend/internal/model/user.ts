import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export default class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    password_hash: string;

    @Column({ type: 'varchar', length: 255 })
    full_name: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatar_url: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone_number: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'datetime', nullable: true })
    email_verified_at: Date;

  // Số lần nhập sai mật khẩu liên tiếp gần nhất
  @Column({ type: 'int', default: 0 })
  failed_login_attempts: number;

  // Thời điểm tài khoản bị khóa tạm thời do nhập sai nhiều lần
  @Column({ type: 'datetime', nullable: true })
  locked_until: Date | null;

    @Column({ type: 'datetime', nullable: true })
    last_login_at: Date;

    // Dùng timestamp để tránh lỗi "Invalid default value" trên một số cấu hình MySQL
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    // Không dùng ON UPDATE ở mức DB để tránh lỗi "Invalid ON UPDATE clause" trên một số phiên bản MySQL
    // Nếu cần, có thể tự cập nhật trường này trong application layer.
    @Column({ type: 'timestamp', nullable: true })
    updated_at: Date;

    @Column({ type: 'datetime', nullable: true })
    deleted_at: Date;
}
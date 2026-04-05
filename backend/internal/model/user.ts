import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Entity: `users`
 * Mục đích: Lưu thông tin tài khoản người dùng.
 *
 * Cột chính:
 * - email/password_hash/full_name: thông tin đăng nhập & hồ sơ
 * - avatar_url/phone_number/bio: thông tin bổ sung (nullable)
 * - is_active: trạng thái kích hoạt
 * - email_verified_at: (nullable) thời điểm xác thực email
 * - failed_login_attempts/locked_until: chống brute-force/khóa tạm
 * - last_login_at: (nullable) lần đăng nhập gần nhất
 * - created_at/updated_at/deleted_at: timestamps (soft delete)
 */
@Entity('users')
export default class User {
    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    /** Email đăng nhập (duy nhất). */
    email: string;

    @Column({ type: 'varchar', length: 255 })
    /** Mật khẩu đã hash. */
    password_hash: string;

    @Column({ type: 'varchar', length: 255 })
    /** Họ tên hiển thị. */
    full_name: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    /** URL avatar (nullable). */
    avatar_url: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    /** Số điện thoại (nullable). */
    phone_number: string;

    @Column({ type: 'text', nullable: true })
    /** Giới thiệu/bio (nullable). */
    bio: string;

    @Column({ type: 'boolean', default: true })
    /** True nếu tài khoản đang hoạt động. */
    is_active: boolean;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm email được xác thực (nullable). */
    email_verified_at: Date;

    /** Số lần nhập sai mật khẩu liên tiếp gần nhất. */
    @Column({ type: 'int', default: 0 })
    failed_login_attempts: number;

    /** Thời điểm tài khoản bị khóa tạm do nhập sai nhiều lần (nullable). */
    @Column({ type: 'datetime', nullable: true })
    locked_until: Date | null;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm đăng nhập gần nhất (nullable). */
    last_login_at: Date;

    /** Thời điểm tạo (dùng timestamp để tránh một số lỗi cấu hình MySQL). */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    /**
     * Thời điểm cập nhật gần nhất.
     * Không dùng ON UPDATE ở mức DB để tránh lỗi "Invalid ON UPDATE clause" trên một số phiên bản MySQL.
     */
    @Column({ type: 'timestamp', nullable: true })
    updated_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Soft delete timestamp (nullable). */
    deleted_at: Date;
    /** Trạng thái bật/tắt xác thực 2 lớp. */
    @Column({ name: 'is_2fa_enabled', type: 'tinyint', default: 0 })
    is_2fa_enabled: boolean;

    /** Trạng thái bật/tắt thông báo khi có đăng nhập mới. */
    @Column({ name: 'notify_new_login', type: 'tinyint', default: 1 })
    notify_new_login: boolean;

    /** Cột hỗ trợ tính năng Tin cậy thiết bị (Trusted Device). */
    @Column({ name: 'is_trusted_device', type: 'tinyint', default: 0 })
    is_trusted_device: boolean;

    /** Lưu mã OTP 6 số tạm thời để xác thực 2FA. */
    @Column({ name: 'temp_otp', type: 'varchar', length: 10, nullable: true })
    temp_otp: string | null;

    /** Token một lần cho luồng quên mật khẩu. */
    @Column({ name: 'password_reset_token', type: 'varchar', length: 255, nullable: true })
    password_reset_token: string | null;

    /** Hạn dùng token quên mật khẩu. */
    @Column({ name: 'password_reset_expires_at', type: 'datetime', nullable: true })
    password_reset_expires_at: Date | null;
}
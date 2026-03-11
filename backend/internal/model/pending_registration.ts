import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

/**
 * Entity: `pending_registrations`
 * Mục đích: Lưu tạm thông tin đăng ký trước khi user xác thực (OTP) để tạo tài khoản chính thức.
 *
 * Cột chính:
 * - email: email đăng ký (unique)
 * - full_name: họ tên
 * - password_hash: mật khẩu đã hash (tạm)
 * - role_name: role dự kiến gán sau khi xác thực
 * - code/expires_at: mã OTP và hạn
 * - created_at: thời điểm tạo
 */
@Entity('pending_registrations')
export default class PendingRegistration {
    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    /** Email đăng ký (duy nhất). */
    email: string;

    @Column({ type: 'varchar', length: 255 })
    /** Họ tên người đăng ký. */
    full_name: string;

    @Column({ type: 'varchar', length: 255 })
    /** Mật khẩu đã hash (lưu tạm trước khi xác thực). */
    password_hash: string;

    @Column({ type: 'varchar', length: 50 })
    /** Tên role dự kiến gán sau khi xác thực. */
    role_name: string;

    @Column({ type: 'varchar', length: 10 })
    /** Mã OTP/code xác thực. */
    code: string;

    @Column({ type: 'timestamp' })
    /** Thời điểm mã hết hạn. */
    expires_at: Date;

    @CreateDateColumn({ type: 'timestamp' })
    /** Thời điểm tạo bản ghi. */
    created_at: Date;
}


import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import User from './user';

/**
 * Entity: `email_verifications`
 * Mục đích: Lưu mã xác thực email (OTP/code) cho user, dùng trong đăng ký/đổi email/khôi phục.
 *
 * Cột chính:
 * - user_id: FK -> users
 * - code: mã xác thực (thường dạng số/chuỗi ngắn)
 * - expires_at: thời điểm hết hạn
 * - used_at: (nullable) thời điểm đã sử dụng
 * - created_at: thời điểm tạo
 */
@Entity('email_verifications')
export default class EmailVerification {
    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `users.id`: user cần xác thực email. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @Column({ type: 'varchar', length: 10 })
    /** Mã xác thực (OTP/code). */
    code: string;

    @Column({ type: 'timestamp' })
    /** Thời điểm mã hết hạn. */
    expires_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    /** Thời điểm mã đã được dùng (nullable nếu chưa dùng). */
    used_at: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    /** Thời điểm tạo bản ghi. */
    created_at: Date;
}




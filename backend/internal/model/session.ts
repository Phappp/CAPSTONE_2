import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Entity: `sessions`
 * Mục đích: Lưu session đăng nhập/refresh token (hoặc session app) theo user.
 *
 * Cột chính:
 * - id: UUID PK
 * - sessionID: mã session (unique) dùng để tra cứu nhanh
 * - userID: định danh user sở hữu session (hiện đang để string; thường map tới `users.id`)
 * - createdAt/updatedAt: timestamps
 */
@Entity('sessions')
export default class Session {
    @PrimaryGeneratedColumn('uuid')
    /** Khóa chính UUID. */
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    /** Mã session duy nhất. */
    sessionID: string;

    @Column({ type: 'varchar', length: 255 })
    /** Định danh user sở hữu session (string). */
    userID: string;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    createdAt: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updatedAt: Date;
}






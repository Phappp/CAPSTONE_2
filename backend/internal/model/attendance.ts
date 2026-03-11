/**
 * Entity: `attendance`
 * Mục đích: Lưu điểm danh/nhật ký tham gia của user trong một buổi học live (`live_sessions`).
 *
 * Ràng buộc:
 * - Unique(session_id, user_id): mỗi user chỉ có 1 bản ghi attendance cho 1 session.
 *
 * Cột chính:
 * - session_id: buổi live
 * - user_id: người tham gia
 * - joined_at / left_at: thời điểm vào/ra
 * - duration_seconds: tổng thời lượng tham gia (giây)
 * - status: present/late/absent
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import LiveSession from './live_session';
import User from './user';

@Entity('attendance')
@Unique(['session_id', 'user_id'])
export default class Attendance {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `live_sessions.id`: buổi học live. */
    session_id: number;

    @ManyToOne(() => LiveSession)
    @JoinColumn({ name: 'session_id' })
    /** Quan hệ đến live session. */
    session: LiveSession;

    @Column()
    /** FK -> `users.id`: người tham gia buổi live. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user tham gia. */
    user: User;

    @CreateDateColumn()
    /** Thời điểm user join vào session. */
    joined_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm user rời session (nullable nếu chưa leave). */
    left_at: Date;

    @Column({ type: 'int', nullable: true })
    /** Tổng thời lượng tham gia (giây), có thể tính sau (nullable). */
    duration_seconds: number;

    @Column({
        type: 'enum',
        enum: ['present', 'late', 'absent'],
        default: 'present'
    })
    /** Trạng thái điểm danh. */
    status: string;
}
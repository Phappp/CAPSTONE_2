/**
 * Entity: `ai_chat_sessions`
 * Mục đích: Lưu thông tin phiên chat với AI của người dùng (có thể gắn với 1 course).
 *
 * Cột chính:
 * - id: khóa chính
 * - user_id: người sở hữu phiên chat
 * - course_id: (nullable) course liên quan của phiên chat
 * - started_at / ended_at: thời điểm bắt đầu/kết thúc
 * - message_count: tổng số message trong phiên
 * - tokens_used: tổng token đã sử dụng (để thống kê/giới hạn)
 * - status: trạng thái phiên (active/closed)
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import User from './user';
import Course from './course';

@Entity('ai_chat_sessions')
export default class AIChatSession {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `users.id`: người dùng tạo/ sở hữu phiên chat. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user sở hữu phiên chat. */
    user: User;

    @Column({ nullable: true })
    /** FK -> `courses.id` (nullable): course liên quan (nếu chat theo ngữ cảnh course). */
    course_id: number;

    @ManyToOne(() => Course, { nullable: true })
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course liên quan (nullable). */
    course: Course;

    @CreateDateColumn()
    /** Thời điểm bắt đầu phiên chat (tự động set khi tạo bản ghi). */
    started_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm kết thúc phiên chat (nullable nếu còn active). */
    ended_at: Date;

    @Column({ default: 0 })
    /** Tổng số message trong phiên chat. */
    message_count: number;

    @Column({ default: 0 })
    /** Tổng token đã sử dụng trong phiên chat. */
    tokens_used: number;

    @Column({
        type: 'enum',
        enum: ['active', 'closed'],
        default: 'active'
    })
    /** Trạng thái phiên chat. */
    status: string;
}
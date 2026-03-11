/**
 * Entity: `live_sessions`
 * Mục đích: Lưu thông tin buổi học live (meeting) thuộc course.
 *
 * Cột chính:
 * - course_id: FK -> courses
 * - title/description: thông tin buổi học
 * - start_time/end_time: thời gian diễn ra
 * - meeting_url: link tham gia
 * - recording_url: (nullable) link recording (nếu có)
 * - status: scheduled/ongoing/ended/cancelled
 * - created_by: user tạo buổi live
 * - created_at/updated_at: timestamps
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Course from './course';
import User from './user';

@Entity('live_sessions')
export default class LiveSession {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `courses.id`: course chứa buổi live. */
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    /** Tiêu đề buổi live. */
    title: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả (nullable). */
    description: string;

    @Column({ type: 'datetime' })
    /** Thời gian bắt đầu. */
    start_time: Date;

    @Column({ type: 'datetime' })
    /** Thời gian kết thúc. */
    end_time: Date;

    @Column({ type: 'varchar', length: 500 })
    /** URL meeting để tham gia. */
    meeting_url: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    /** URL recording (nullable). */
    recording_url: string;

    @Column({
        type: 'enum',
        enum: ['scheduled', 'ongoing', 'ended', 'cancelled'],
        default: 'scheduled'
    })
    /** Trạng thái buổi live. */
    status: string;

    @Column()
    /** FK -> `users.id`: người tạo buổi live. */
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    /** Quan hệ đến user tạo. */
    creator: User;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
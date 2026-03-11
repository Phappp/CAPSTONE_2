/**
 * Entity: `course_enrollments`
 * Mục đích: Lưu thông tin ghi danh (enroll) của user vào course.
 *
 * Ràng buộc:
 * - Unique(user_id, course_id): một user không enroll trùng cùng một course.
 *
 * Cột chính:
 * - user_id / course_id: FK tới user & course
 * - enrolled_at: thời điểm ghi danh
 * - enrolled_by: (nullable) ai enroll (admin/instructor) nếu không phải self-enroll
 * - status: trạng thái học (active/completed/dropped/expired)
 * - completed_at / last_accessed_at: thời điểm hoàn thành/lần truy cập gần nhất
 * - progress_percent: % tiến độ tổng quan
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

import User from './user';
import Course from './course';

@Entity('course_enrollments')
@Unique(['user_id', 'course_id'])
export default class CourseEnrollment {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `users.id`: người học/được ghi danh. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @Column()
    /** FK -> `courses.id`: course được ghi danh. */
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @CreateDateColumn()
    /** Thời điểm ghi danh. */
    enrolled_at: Date;

    @Column({ nullable: true })
    /** FK -> `users.id` (nullable): user thực hiện ghi danh (admin/instructor). */
    enrolled_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'enrolled_by' })
    /** Quan hệ đến user thực hiện ghi danh (nullable). */
    enrolledBy: User;

    @Column({
        type: 'enum',
        enum: ['active', 'completed', 'dropped', 'expired'],
        default: 'active'
    })
    /** Trạng thái ghi danh/quá trình học. */
    status: string;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm hoàn thành course (nullable). */
    completed_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm truy cập course gần nhất (nullable). */
    last_accessed_at: Date;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    })
    /** Tiến độ course (%). */
    progress_percent: number;
}
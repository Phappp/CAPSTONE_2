/**
 * Entity: `course_instructors`
 * Mục đích: Bảng liên kết N-N giữa course và instructor (user), hỗ trợ nhiều giảng viên cho một course.
 *
 * Khóa chính:
 * - (course_id, instructor_id): composite primary key.
 *
 * Cột chính:
 * - is_primary: đánh dấu giảng viên chính của course
 * - assigned_at: thời điểm gán giảng viên vào course
 */
import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import Course from './course';
import User from './user';

@Entity('course_instructors')
export default class CourseInstructor {

    @PrimaryColumn()
    /** FK -> `courses.id`: course được gán giảng viên. */
    course_id: number;

    @PrimaryColumn()
    /** FK -> `users.id`: giảng viên của course. */
    instructor_id: number;

    @ManyToOne(() => Course, course => course.instructors)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'instructor_id' })
    /** Quan hệ đến instructor (user). */
    instructor: User;

    @Column({ type: 'boolean', default: false })
    /** True nếu là giảng viên chính (primary instructor). */
    is_primary: boolean;

    @CreateDateColumn()
    /** Thời điểm được gán vào course. */
    assigned_at: Date;
}
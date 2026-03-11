/**
 * Entity: `course_completion_requirements`
 * Mục đích: Cấu hình điều kiện hoàn thành course (completion rules) theo từng course.
 *
 * Khóa chính:
 * - course_id: 1-1 với `courses` (mỗi course có tối đa 1 cấu hình).
 *
 * Cột chính:
 * - require_all_lessons: bắt buộc hoàn thành tất cả lesson
 * - require_all_assignments: bắt buộc hoàn thành tất cả assignment
 * - min_quiz_score: (nullable) điểm quiz tối thiểu để tính hoàn thành
 * - require_final_exam: có yêu cầu bài thi cuối khóa không
 */
import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import Course from './course';

@Entity('course_completion_requirements')
export default class CourseCompletionRequirement {

    @PrimaryColumn()
    /** FK -> `courses.id`: course áp dụng cấu hình hoàn thành. */
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @Column({ type: 'boolean', default: true })
    /** Yêu cầu hoàn thành tất cả lessons. */
    require_all_lessons: boolean;

    @Column({ type: 'boolean', default: true })
    /** Yêu cầu hoàn thành tất cả assignments. */
    require_all_assignments: boolean;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    /** Điểm quiz tối thiểu (nullable nếu không áp điều kiện). */
    min_quiz_score: number;

    @Column({ type: 'boolean', default: false })
    /** True nếu yêu cầu final exam để hoàn thành course. */
    require_final_exam: boolean;
}
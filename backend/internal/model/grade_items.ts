/**
 * Entity: `grade_items`
 * Mục đích: Định nghĩa “hạng mục chấm điểm” (gradebook item) trong một course.
 * Ví dụ: assignment, quiz, exam, participation...
 *
 * Cột chính:
 * - course_id: FK -> courses
 * - item_type: loại hạng mục (assignment/quiz/exam/participation)
 * - item_id: id của entity tương ứng (ví dụ assignment.id / quiz.id)
 * - name: tên hiển thị trên gradebook
 * - max_score: điểm tối đa
 * - weight: trọng số khi tính tổng điểm
 * - due_date: hạn (nullable)
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

@Entity('grade_items')
export default class GradeItem {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `courses.id`: course sở hữu grade item. */
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @Column({
        type: 'enum',
        enum: ['assignment', 'quiz', 'exam', 'participation']
    })
    /** Loại hạng mục chấm điểm. */
    item_type: string;

    @Column()
    /** ID của item theo `item_type` (assignment/quiz/...). */
    item_id: number;

    @Column({ type: 'varchar', length: 255 })
    /** Tên hiển thị trên bảng điểm. */
    name: string;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    /** Điểm tối đa của grade item. */
    max_score: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 1.0
    })
    /** Trọng số dùng để tính tổng điểm. */
    weight: number;

    @Column({ type: 'datetime', nullable: true })
    /** Hạn (nullable). */
    due_date: Date;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
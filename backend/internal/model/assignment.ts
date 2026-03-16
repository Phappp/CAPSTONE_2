/**
 * Entity: `assignments`
 * Mục đích: Bài tập (assignment) gắn với một lesson.
 *
 * Cột chính:
 * - lesson_id: FK -> lessons
 * - title/description/instructions: nội dung bài tập
 * - max_score/passing_score: thang điểm & điểm đạt (nullable)
 * - due_date: hạn nộp (nullable)
 * - late_submission_days/late_penalty_percent: chính sách nộp trễ
 * - allow_resubmission/max_resubmissions: cho phép nộp lại
 * - submission_format: cấu hình định dạng nộp (JSON) (nullable)
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

import Lesson from './lesson';

@Entity('assignments')
export default class Assignment {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `lessons.id`: lesson chứa assignment. */
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    /** Quan hệ đến lesson. */
    lesson: Lesson;

    @Column({ type: 'varchar', length: 255 })
    /** Tiêu đề assignment. */
    title: string;

    @Column({ type: 'text' })
    /** Mô tả bài tập. */
    description: string;

    @Column({ type: 'text', nullable: true })
    /** Hướng dẫn làm bài (nullable). */
    instructions: string;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    /** Điểm tối đa của bài tập. */
    max_score: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    /** Điểm đạt (nullable nếu không áp). */
    passing_score: number;

    @Column({ type: 'datetime', nullable: true })
    /** Hạn nộp bài (nullable). */
    due_date: Date;

    @Column({ type: 'int', default: 0 })
    /** Số ngày cho phép nộp trễ. */
    late_submission_days: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    })
    /** % phạt khi nộp trễ. */
    late_penalty_percent: number;

    @Column({ type: 'boolean', default: false })
    /** Cho phép nộp lại. */
    allow_resubmission: boolean;

    @Column({ type: 'int', default: 1 })
    /** Số lần nộp tối đa khi cho phép nộp lại. */
    max_resubmissions: number;

    @Column({ type: 'json', nullable: true })
    /** Cấu hình định dạng nộp bài (JSON) (nullable). */
    submission_format: any;

    @Column({ type:'json',nullable:true })
    /** Cấu hình đính kèm bài tập (JSON) (nullable). */
    attachments: any;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
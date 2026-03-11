/**
 * Entity: `submission_feedback`
 * Mục đích: Lưu kết quả chấm/feedback cho một submission.
 *
 * Cột chính:
 * - submission_id: FK -> submissions
 * - grader_id: FK -> users (người chấm)
 * - score: điểm
 * - feedback_text: nhận xét (nullable)
 * - is_auto_graded: chấm tự động hay thủ công
 * - graded_at/updated_at: timestamps
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

import Submission from './submissions';
import User from './user';

@Entity('submission_feedback')
export default class SubmissionFeedback {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `submissions.id`: submission được chấm. */
    submission_id: number;

    @ManyToOne(() => Submission)
    @JoinColumn({ name: 'submission_id' })
    /** Quan hệ đến submission. */
    submission: Submission;

    @Column()
    /** FK -> `users.id`: người chấm. */
    grader_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'grader_id' })
    /** Quan hệ đến user chấm. */
    grader: User;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    /** Điểm chấm. */
    score: number;

    @Column({ type: 'text', nullable: true })
    /** Nhận xét (nullable). */
    feedback_text: string;

    @Column({ type: 'boolean', default: false })
    /** True nếu chấm tự động. */
    is_auto_graded: boolean;

    @CreateDateColumn()
    /** Thời điểm chấm. */
    graded_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
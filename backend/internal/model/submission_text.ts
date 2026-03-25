/**
 * Entity: `submission_text`
 * Mục đích: Lưu nội dung bài làm dạng văn bản (text submission) của học viên.
 *
 * Cột chính:
 * - id: Khóa chính (auto)
 * - submission_id: FK -> submissions (bản ghi nộp bài gốc)
 * - content: nội dung văn bản học viên nhập
 * - created_at/updated_at: timestamps
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Submission from './submissions';

@Entity('submission_text')
export default class SubmissionText {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `submissions.id`: Bài nộp chứa đoạn văn bản này. */
    submission_id: number;

    @OneToOne(() => Submission)
    @JoinColumn({ name: 'submission_id' })
    /** Quan hệ 1-1 đến submission gốc. */
    submission: Submission;

    @Column({ type: 'text' })
    /** Nội dung bài làm dạng văn bản (có thể chứa HTML/Markdown). */
    content: string;

    @CreateDateColumn()
    /** Thời điểm tạo bản ghi. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
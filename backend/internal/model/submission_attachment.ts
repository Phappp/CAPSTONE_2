/**
 * Entity: `submission_attachments`
 * Mục đích: Lưu tệp đính kèm cho một submission (bài nộp).
 *
 * Cột chính:
 * - submission_id: FK -> submissions
 * - file_name/file_path: tên file & đường dẫn lưu trữ
 * - file_size: kích thước (bytes)
 * - mime_type: loại file (content-type)
 * - uploaded_at: thời điểm upload/đính kèm
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import Submission from './submissions';

@Entity('submission_attachments')
export default class SubmissionAttachment {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `submissions.id`: submission cha. */
    submission_id: number;

    @ManyToOne(() => Submission)
    @JoinColumn({ name: 'submission_id' })
    /** Quan hệ đến submission. */
    submission: Submission;

    @Column({ type: 'varchar', length: 255 })
    /** Tên file hiển thị. */
    file_name: string;

    @Column({ type: 'varchar', length: 500 })
    /** Đường dẫn lưu file (disk/object storage). */
    file_path: string;

    @Column({ type: 'int' })
    /** Kích thước file (bytes). */
    file_size: number;

    @Column({ type: 'varchar', length: 100 })
    /** MIME type của file. */
    mime_type: string;

    @CreateDateColumn()
    /** Thời điểm upload/đính kèm. */
    uploaded_at: Date;
}
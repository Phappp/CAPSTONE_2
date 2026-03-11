/**
 * Entity: `ai_quiz_generation_jobs`
 * Mục đích: Lưu job sinh quiz bằng AI từ một `content_item` theo yêu cầu của user.
 *
 * Cột chính:
 * - id: khóa chính
 * - requested_by: user yêu cầu sinh quiz
 * - content_item_id: nội dung nguồn để AI sinh quiz
 * - status: trạng thái xử lý job (pending/processing/completed/failed)
 * - parameters: tham số đầu vào (prompt/config) dạng JSON
 * - result_summary: tóm tắt kết quả (metadata) dạng JSON
 * - created_at / completed_at: thời điểm tạo/hoàn tất job
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
import ContentItem from './content_items';

@Entity('ai_quiz_generation_jobs')
export default class AIQuizGenerationJob {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `users.id`: người yêu cầu tạo quiz bằng AI. */
    requested_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requested_by' })
    /** Quan hệ đến user yêu cầu. */
    requester: User;

    @Column()
    /** FK -> `content_items.id`: content item dùng làm nguồn để sinh quiz. */
    content_item_id: number;

    @ManyToOne(() => ContentItem)
    @JoinColumn({ name: 'content_item_id' })
    /** Quan hệ đến content item nguồn. */
    contentItem: ContentItem;

    @Column({
        type: 'enum',
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    })
    /** Trạng thái xử lý của job. */
    status: string;

    @Column({ type: 'json', nullable: true })
    /** Tham số đầu vào phục vụ sinh quiz (nullable). */
    parameters: object;

    @Column({ type: 'json', nullable: true })
    /** Tóm tắt kết quả job (nullable; lưu metadata thay vì dữ liệu lớn). */
    result_summary: object;

    @CreateDateColumn()
    /** Thời điểm tạo job. */
    created_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm hoàn tất job (nullable nếu chưa xong). */
    completed_at: Date;
}
/**
 * Entity: `content_items`
 * Mục đích: Lưu các “mảnh nội dung” (video, tài liệu, bài đọc, link, v.v.) thuộc một lesson.
 * Nội dung chi tiết được lưu trong `content_data` (JSON) theo `content_type_id`.
 *
 * Cột chính:
 * - lesson_id: FK -> lessons
 * - content_type_id: FK -> content_types
 * - title: tiêu đề content item
 * - content_data: dữ liệu nội dung (JSON)
 * - order_index: thứ tự hiển thị trong lesson
 * - is_required: có bắt buộc hoàn thành không
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
import ContentType from './content_type';

@Entity('content_items')
export default class ContentItem {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `lessons.id`: lesson chứa content item này. */
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    /** Quan hệ đến lesson. */
    lesson: Lesson;

    @Column()
    /** FK -> `content_types.id`: loại nội dung (video/pdf/text/...). */
    content_type_id: number;

    @ManyToOne(() => ContentType)
    @JoinColumn({ name: 'content_type_id' })
    /** Quan hệ đến content type. */
    contentType: ContentType;

    @Column({ type: 'varchar', length: 255 })
    /** Tiêu đề content item. */
    title: string;

    @Column({ type: 'json' })
    /** Payload nội dung theo loại (JSON). */
    content_data: any;

    @Column()
    /** Thứ tự hiển thị trong lesson. */
    order_index: number;

    @Column({ type: 'boolean', default: false })
    /** True nếu content item bắt buộc hoàn thành. */
    is_required: boolean;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
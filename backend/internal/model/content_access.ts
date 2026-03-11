/**
 * Entity: `content_access`
 * Mục đích: Định nghĩa điều kiện truy cập cho một `content_item` (ví dụ: phải hoàn thành lesson trước đó
 * hoặc phải xem tối thiểu X giây).
 *
 * Cột chính:
 * - content_item_id: content item cần điều kiện
 * - required_lesson_id: (nullable) lesson tiên quyết
 * - required_completion: có yêu cầu hoàn thành lesson tiên quyết không
 * - min_time_seconds: (nullable) thời gian tối thiểu cần đạt
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import ContentItem from './content_items';
import Lesson from './lesson';

@Entity('content_access')
export default class ContentAccess {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `content_items.id`: nội dung bị ràng buộc điều kiện truy cập. */
    content_item_id: number;

    @ManyToOne(() => ContentItem)
    @JoinColumn({ name: 'content_item_id' })
    /** Quan hệ đến content item. */
    contentItem: ContentItem;

    @Column({ nullable: true })
    /** FK -> `lessons.id` (nullable): lesson tiên quyết. */
    required_lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'required_lesson_id' })
    /** Quan hệ đến lesson tiên quyết. */
    requiredLesson: Lesson;

    @Column({ type: 'boolean', default: true })
    /** True nếu yêu cầu hoàn thành lesson tiên quyết. */
    required_completion: boolean;

    @Column({ type: 'int', nullable: true })
    /** Thời gian tối thiểu (giây) cần đạt để mở khóa (nullable). */
    min_time_seconds: number;
}
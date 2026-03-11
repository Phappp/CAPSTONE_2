/**
 * Entity: `content_types`
 * Mục đích: Danh mục loại nội dung để phân loại `content_items` (ví dụ: video, pdf, text, link...).
 *
 * Cột chính:
 * - name: tên loại nội dung (unique)
 * - description: mô tả (nullable)
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column
} from 'typeorm';

@Entity('content_types')
export default class ContentType {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    /** Tên loại nội dung (duy nhất). */
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    /** Mô tả loại nội dung (nullable). */
    description: string;
}
/**
 * Entity: `lessons`
 * Mục đích: Bài học trong một module/chương (mỗi module có nhiều lessons).
 *
 * Cột chính:
 * - module_id: FK -> modules
 * - title/description: thông tin bài
 * - order_index: thứ tự bài trong module
 * - duration_minutes: (nullable) thời lượng dự kiến
 * - is_published: bật/tắt hiển thị
 * - is_free_preview: cho phép xem thử miễn phí
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

import Module from './modules';

@Entity('lessons')
export default class Lesson {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `modules.id`: module/chương chứa lesson này. */
    module_id: number;

    @ManyToOne(() => Module, module => module.lessons)
    @JoinColumn({ name: 'module_id' })
    /** Quan hệ đến module. */
    module: Module;

    @Column({ type: 'varchar', length: 255 })
    /** Tên bài học. */
    title: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả bài học (nullable). */
    description: string;

    @Column({
        type: 'enum',
        enum: ['video', 'text', 'quiz', 'assignment'],
        default: 'text'
    })
    /** Loại bài học: video/text/quiz/assignment */
    lesson_type: string;

    @Column()
    /** Thứ tự lesson trong module. */
    order_index: number;

    @Column({ type: 'int', nullable: true })
    /** Thời lượng dự kiến (phút) (nullable). */
    duration_minutes: number;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm mở lesson cho learner (nullable => mở ngay). */
    open_at: Date;

    @Column({ type: 'boolean', default: true })
    /** True nếu lesson được publish/hiển thị. */
    is_published: boolean;

    @Column({ type: 'boolean', default: false })
    /** True nếu lesson cho phép preview miễn phí. */
    is_free_preview: boolean;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
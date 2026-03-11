/**
 * Entity: `modules`
 * Mục đích: Module/Chương trong course (mỗi course có nhiều module).
 *
 * Cột chính:
 * - course_id: FK -> courses
 * - title/description: thông tin chương
 * - order_index: thứ tự chương trong course
 * - is_published: bật/tắt hiển thị
 * - created_at/updated_at: timestamps
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Course from './course';
import Lesson from './lesson';

@Entity('modules')
export default class Module {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `courses.id`: course chứa module/chương này. */
    course_id: number;

    @ManyToOne(() => Course, course => course.modules)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    /** Tên chương/module. */
    title: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả chương (nullable). */
    description: string;

    @Column()
    /** Thứ tự chương trong course. */
    order_index: number;

    @Column({ type: 'boolean', default: true })
    /** True nếu module được publish/hiển thị. */
    is_published: boolean;

    @OneToMany(() => Lesson, lesson => lesson.module)
    /** Danh sách lessons thuộc module. */
    lessons: Lesson[];

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
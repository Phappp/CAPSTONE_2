/**
 * Entity: `question_banks`
 * Mục đích: Ngân hàng câu hỏi (question bank) theo course, để quản lý/ tái sử dụng câu hỏi.
 *
 * Cột chính:
 * - course_id: FK -> courses (ngân hàng thuộc course nào)
 * - name/description: tên & mô tả ngân hàng
 * - created_by: user tạo ngân hàng
 * - is_shared: ngân hàng dùng chung hay private
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

import Course from './course';
import User from './user';

@Entity('question_banks')
export default class QuestionBank {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `courses.id`: course sở hữu question bank này. */
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    /** Quan hệ đến course. */
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    /** Tên question bank. */
    name: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả (nullable). */
    description: string;

    @Column()
    /** FK -> `users.id`: người tạo question bank. */
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    /** Quan hệ đến user tạo. */
    creator: User;

    @Column({ type: 'boolean', default: false })
    /** True nếu ngân hàng được chia sẻ cho nhiều người dùng. */
    is_shared: boolean;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
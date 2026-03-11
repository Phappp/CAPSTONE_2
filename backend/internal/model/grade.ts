/**
 * Entity: `grades`
 * Mục đích: Lưu điểm (score) của user cho một `grade_item` (ví dụ: assignment/quiz/...).
 *
 * Ràng buộc:
 * - Unique(grade_item_id, user_id): mỗi user chỉ có 1 điểm cho 1 grade item.
 *
 * Cột chính:
 * - grade_item_id: hạng mục chấm điểm
 * - user_id: người được chấm
 * - score: điểm số
 * - feedback: nhận xét (nullable)
 * - graded_by: user chấm điểm (giảng viên)
 * - graded_at/updated_at: timestamps
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Unique
} from 'typeorm';

import GradeItem from './grade_items';
import User from './user';

@Entity('grades')
@Unique(['grade_item_id', 'user_id'])
export default class Grade {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `grade_items.id`: hạng mục chấm điểm. */
    grade_item_id: number;

    @ManyToOne(() => GradeItem)
    @JoinColumn({ name: 'grade_item_id' })
    /** Quan hệ đến grade item. */
    gradeItem: GradeItem;

    @Column()
    /** FK -> `users.id`: người được chấm điểm. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    /** Điểm số. */
    score: number;

    @Column({ type: 'text', nullable: true })
    /** Nhận xét (nullable). */
    feedback: string;

    @Column()
    /** FK -> `users.id`: người chấm điểm. */
    graded_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'graded_by' })
    /** Quan hệ đến user chấm điểm. */
    grader: User;

    @CreateDateColumn()
    /** Thời điểm chấm điểm. */
    graded_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
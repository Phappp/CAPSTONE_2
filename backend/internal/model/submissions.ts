/**
 * Entity: `submissions`
 * Mục đích: Lưu bài nộp (submission) của user cho một assignment.
 *
 * Ràng buộc:
 * - Unique(assignment_id, user_id, resubmission_count): phân biệt các lần nộp lại.
 *
 * Cột chính:
 * - assignment_id: FK -> assignments
 * - user_id: FK -> users (người nộp)
 * - submitted_at: thời điểm nộp (auto)
 * - is_late: nộp trễ hay không
 * - resubmission_count: số lần nộp lại (0 là lần đầu)
 * - status: draft/submitted/graded/returned
 * - created_at/updated_at: timestamps
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

import Assignment from './assignment';
import User from './user';

@Entity('submissions')
@Unique(['assignment_id', 'user_id', 'resubmission_count'])
export default class Submission {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `assignments.id`: assignment được nộp. */
    assignment_id: number;

    @ManyToOne(() => Assignment)
    @JoinColumn({ name: 'assignment_id' })
    /** Quan hệ đến assignment. */
    assignment: Assignment;

    @Column()
    /** FK -> `users.id`: người nộp bài. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @CreateDateColumn()
    /** Thời điểm nộp (hoặc tạo submission). */
    submitted_at: Date;

    @Column({ type: 'boolean', default: false })
    /** True nếu submission bị đánh dấu nộp trễ. */
    is_late: boolean;

    @Column({ type: 'int', default: 0 })
    /** Số lần nộp lại (0 = lần đầu). */
    resubmission_count: number;

    @Column({
        type: 'enum',
        enum: ['draft', 'submitted', 'graded', 'returned'],
        default: 'submitted'
    })
    /** Trạng thái submission. */
    status: string;

    @CreateDateColumn()
    /** Thời điểm tạo bản ghi. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
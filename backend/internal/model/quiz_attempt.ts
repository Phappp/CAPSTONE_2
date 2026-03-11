/**
 * Entity: `quiz_attempts`
 * Mục đích: Lưu mỗi lần làm quiz của user (một user có thể làm nhiều lần theo `attempt_number`).
 *
 * Ràng buộc:
 * - Unique(quiz_id, user_id, attempt_number): không trùng số lần làm cho cùng user & quiz.
 *
 * Cột chính:
 * - quiz_id: quiz được làm
 * - user_id: người làm
 * - attempt_number: lần thử thứ N
 * - started_at/submitted_at: thời điểm bắt đầu/nộp
 * - time_spent_seconds: thời gian làm (giây) (nullable)
 * - score/is_passed: điểm & đạt hay không (nullable nếu chưa chấm)
 * - status: in_progress/submitted/graded
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import Quiz from './quizze';
import User from './user';

@Entity('quiz_attempts')
@Unique(['quiz_id', 'user_id', 'attempt_number'])
export default class QuizAttempt {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `quizzes.id`: quiz được làm. */
    quiz_id: number;

    @ManyToOne(() => Quiz)
    @JoinColumn({ name: 'quiz_id' })
    /** Quan hệ đến quiz. */
    quiz: Quiz;

    @Column()
    /** FK -> `users.id`: người làm quiz. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @Column()
    /** Số lần làm (1,2,3...). */
    attempt_number: number;

    @CreateDateColumn()
    /** Thời điểm bắt đầu attempt. */
    started_at: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm nộp bài (nullable nếu chưa nộp). */
    submitted_at: Date;

    @Column({ type: 'int', nullable: true })
    /** Thời gian làm (giây) (nullable). */
    time_spent_seconds: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    /** Điểm đạt được (nullable nếu chưa chấm). */
    score: number;

    @Column({ type: 'boolean', nullable: true })
    /** True/False nếu đã xác định đạt; nullable nếu chưa chấm. */
    is_passed: boolean;

    @Column({
        type: 'enum',
        enum: ['in_progress', 'submitted', 'graded'],
        default: 'in_progress'
    })
    /** Trạng thái attempt. */
    status: string;
}
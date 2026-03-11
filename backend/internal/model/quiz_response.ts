/**
 * Entity: `quiz_responses`
 * Mục đích: Lưu câu trả lời của một attempt cho từng `quiz_question`.
 *
 * Cột chính:
 * - attempt_id: FK -> quiz_attempts
 * - quiz_question_id: FK -> quiz_questions
 * - is_correct: (nullable) đúng/sai sau khi chấm
 * - points_earned: (nullable) điểm nhận được cho câu
 * - created_at: thời điểm ghi nhận response
 *
 * Ghi chú:
 * - Với câu trắc nghiệm: lựa chọn được lưu ở `quiz_response_options`
 * - Với câu text/essay: nội dung được lưu ở `quiz_response_text`
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import QuizAttempt from './quiz_attempt';
import QuizQuestion from './quiz_question';

@Entity('quiz_responses')
export default class QuizResponse {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `quiz_attempts.id`: attempt cha. */
    attempt_id: number;

    @ManyToOne(() => QuizAttempt)
    @JoinColumn({ name: 'attempt_id' })
    /** Quan hệ đến quiz attempt. */
    attempt: QuizAttempt;

    @Column()
    /** FK -> `quiz_questions.id`: câu hỏi cụ thể trong quiz. */
    quiz_question_id: number;

    @ManyToOne(() => QuizQuestion)
    @JoinColumn({ name: 'quiz_question_id' })
    /** Quan hệ đến quiz question. */
    quizQuestion: QuizQuestion;

    @Column({ type: 'boolean', nullable: true })
    /** Đúng/sai (nullable nếu chưa chấm). */
    is_correct: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    /** Điểm nhận được (nullable nếu chưa chấm). */
    points_earned: number;

    @CreateDateColumn()
    /** Thời điểm tạo response. */
    created_at: Date;
}
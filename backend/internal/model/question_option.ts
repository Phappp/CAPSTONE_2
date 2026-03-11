/**
 * Entity: `question_options`
 * Mục đích: Lưu các đáp án (options) cho từng `quiz_question` (câu hỏi đã “gắn” vào quiz).
 *
 * Cột chính:
 * - quiz_question_id: FK -> quiz_questions
 * - option_text: nội dung đáp án
 * - is_correct: đánh dấu đáp án đúng
 * - order_index: thứ tự hiển thị option
 * - explanation: (nullable) giải thích cho option
 * - created_at: thời điểm tạo
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import QuizQuestion from './quiz_question';

@Entity('question_options')
export default class QuestionOption {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `quiz_questions.id`: câu hỏi trong quiz mà option thuộc về. */
    quiz_question_id: number;

    @ManyToOne(() => QuizQuestion)
    @JoinColumn({ name: 'quiz_question_id' })
    /** Quan hệ đến quiz question. */
    quizQuestion: QuizQuestion;

    @Column({ type: 'text' })
    /** Nội dung option. */
    option_text: string;

    @Column({ type: 'boolean', default: false })
    /** True nếu option đúng. */
    is_correct: boolean;

    @Column()
    /** Thứ tự hiển thị. */
    order_index: number;

    @Column({ type: 'text', nullable: true })
    /** Giải thích cho option (nullable). */
    explanation: string;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;
}
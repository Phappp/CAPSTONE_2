/**
 * Entity: `quiz_questions`
 * Mục đích: Bảng mapping câu hỏi ngân hàng (`bank_questions`) vào một quiz cụ thể (`quizzes`)
 * và lưu thứ tự/điểm cho câu hỏi trong quiz đó.
 *
 * Cột chính:
 * - quiz_id: FK -> quizzes
 * - bank_question_id: FK -> bank_questions
 * - order_index: thứ tự câu trong quiz
 * - points: điểm của câu trong quiz (có thể override điểm mặc định của bank question)
 * - created_at: thời điểm tạo mapping
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import Quiz from './quizze';
import BankQuestion from './bank_questions';

@Entity('quiz_questions')
export default class QuizQuestion {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `quizzes.id`: quiz chứa câu hỏi này. */
    quiz_id: number;

    @ManyToOne(() => Quiz)
    @JoinColumn({ name: 'quiz_id' })
    /** Quan hệ đến quiz. */
    quiz: Quiz;

    @Column()
    /** FK -> `bank_questions.id`: câu hỏi nguồn từ ngân hàng. */
    bank_question_id: number;

    @ManyToOne(() => BankQuestion)
    @JoinColumn({ name: 'bank_question_id' })
    /** Quan hệ đến bank question. */
    bankQuestion: BankQuestion;

    @Column()
    /** Thứ tự câu hỏi trong quiz. */
    order_index: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 1.0
    })
    /** Điểm của câu hỏi trong quiz. */
    points: number;

    @CreateDateColumn()
    /** Thời điểm tạo mapping. */
    created_at: Date;
}
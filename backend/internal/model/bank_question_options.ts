/**
 * Entity: `bank_question_options`
 * Mục đích: Lưu các lựa chọn đáp án (options) cho câu hỏi ngân hàng dạng trắc nghiệm.
 *
 * Cột chính:
 * - question_id: FK -> `bank_questions.id`
 * - option_text: nội dung lựa chọn
 * - is_correct: có phải đáp án đúng không
 * - order_index: thứ tự hiển thị option trong câu hỏi
 * - explanation: giải thích cho option (nullable)
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

import BankQuestion from './bank_questions';

@Entity('bank_question_options')
export default class BankQuestionOption {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `bank_questions.id`: câu hỏi cha. */
    question_id: number;

    @ManyToOne(() => BankQuestion, (question) => question.options)
    @JoinColumn({ name: 'question_id' })
    /** Quan hệ đến bank question. */
    question: BankQuestion;

    @Column({ type: 'text' })
    /** Nội dung option. */
    option_text: string;

    @Column({ type: 'boolean', default: false })
    /** Đánh dấu option đúng/sai. */
    is_correct: boolean;

    @Column()
    /** Thứ tự hiển thị của option. */
    order_index: number;

    @Column({ type: 'text', nullable: true })
    /** Giải thích cho option (nullable). */
    explanation: string;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;
}
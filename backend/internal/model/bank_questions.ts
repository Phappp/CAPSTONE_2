/**
 * Entity: `bank_questions`
 * Mục đích: Lưu câu hỏi trong ngân hàng câu hỏi (question bank) để tái sử dụng cho nhiều quiz.
 *
 * Cột chính:
 * - bank_id: FK tới `question_banks`
 * - question_type: loại câu hỏi (MCQ, true/false, short answer, ...)
 * - question_text / explanation: nội dung & giải thích
 * - difficulty / category / tags: metadata phân loại
 * - points: điểm mặc định của câu hỏi
 * - created_by: user tạo câu hỏi
 * - is_ai_generated: câu hỏi do AI sinh hay không
 * - created_at / updated_at: timestamps
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

import QuestionBank from './question_banks';
import User from './user';

@Entity('bank_questions')
export default class BankQuestion {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `question_banks.id`: ngân hàng chứa câu hỏi này. */
    bank_id: number;

    @ManyToOne(() => QuestionBank)
    @JoinColumn({ name: 'bank_id' })
    /** Quan hệ đến question bank. */
    bank: QuestionBank;

    @Column({
        type: 'enum',
        enum: [
            'multiple_choice',
            'true_false',
            'short_answer',
            'essay',
            'fill_blank'
        ]
    })
    /** Loại câu hỏi. */
    question_type: string;

    @Column({ type: 'text' })
    /** Nội dung câu hỏi. */
    question_text: string;

    @Column({ type: 'text', nullable: true })
    /** Giải thích/đáp án mẫu (nullable). */
    explanation: string;

    @Column({
        type: 'enum',
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    })
    /** Độ khó câu hỏi. */
    difficulty: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    /** Danh mục/nhãn nhóm câu hỏi (nullable). */
    category: string;

    @Column({ type: 'json', nullable: true })
    /** Tags dạng JSON array (nullable). */
    tags: string[];

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 1.0
    })
    /** Điểm mặc định cho câu hỏi. */
    points: number;

    @Column()
    /** FK -> `users.id`: người tạo câu hỏi. */
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    /** Quan hệ đến user tạo câu hỏi. */
    creator: User;

    @Column({ type: 'boolean', default: false })
    /** True nếu câu hỏi do AI sinh. */
    is_ai_generated: boolean;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}
/**
 * Entity: `generated_questions`
 * Mục đích: Lưu câu hỏi do AI sinh ra trong quá trình chạy `ai_quiz_generation_jobs`.
 * Có thể được “accept” để đưa vào ngân hàng câu hỏi.
 *
 * Cột chính:
 * - job_id: FK -> ai_quiz_generation_jobs
 * - bank_question_id: (nullable) câu hỏi đã được lưu vào bank_questions sau khi accept
 * - question_data: payload câu hỏi do AI sinh (JSON)
 * - is_accepted: đã duyệt/nhận câu hỏi này hay chưa
 * - feedback: (nullable) ghi chú/feedback khi duyệt
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

import AIQuizGenerationJob from './ai_quiz_generation_job';
import BankQuestion from './bank_questions';

@Entity('generated_questions')
export default class GeneratedQuestion {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `ai_quiz_generation_jobs.id`: job sinh câu hỏi. */
    job_id: number;

    @ManyToOne(() => AIQuizGenerationJob)
    @JoinColumn({ name: 'job_id' })
    /** Quan hệ đến job. */
    job: AIQuizGenerationJob;

    @Column({ nullable: true })
    /** FK -> `bank_questions.id` (nullable): câu hỏi đã import vào ngân hàng (nếu có). */
    bank_question_id: number;

    @ManyToOne(() => BankQuestion, { nullable: true })
    @JoinColumn({ name: 'bank_question_id' })
    /** Quan hệ đến bank question (nullable). */
    bankQuestion: BankQuestion;

    @Column({ type: 'json' })
    /** Payload câu hỏi do AI sinh (JSON). */
    question_data: object;

    @Column({ default: false })
    /** True nếu câu hỏi đã được accept/duyệt. */
    is_accepted: boolean;

    @Column({ type: 'text', nullable: true })
    /** Feedback/ghi chú khi duyệt (nullable). */
    feedback: string;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;
}
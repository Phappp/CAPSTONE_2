/**
 * Entity: `quiz_response_text`
 * Mục đích: Lưu câu trả lời dạng text/essay cho một `quiz_response`.
 *
 * Khóa chính:
 * - response_id: 1-1 với `quiz_responses` (mỗi response tối đa 1 nội dung text).
 *
 * Cột chính:
 * - answer_text: nội dung trả lời của học viên
 * - ai_feedback: (nullable) phản hồi/gợi ý do AI sinh
 * - ai_score: (nullable) điểm do AI chấm (nếu áp dụng)
 */
import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import QuizResponse from './quiz_response';

@Entity('quiz_response_text')
export default class QuizResponseText {

    @PrimaryColumn()
    /** FK -> `quiz_responses.id`: response cha (cũng là PK). */
    response_id: number;

    @ManyToOne(() => QuizResponse)
    @JoinColumn({ name: 'response_id' })
    /** Quan hệ đến quiz response. */
    response: QuizResponse;

    @Column({ type: 'text' })
    /** Nội dung trả lời dạng text. */
    answer_text: string;

    @Column({ type: 'text', nullable: true })
    /** Feedback do AI sinh (nullable). */
    ai_feedback: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    /** Điểm AI chấm (nullable). */
    ai_score: number;
}
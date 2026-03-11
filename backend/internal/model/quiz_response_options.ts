/**
 * Entity: `quiz_response_options`
 * Mục đích: Bảng liên kết N-N giữa `quiz_responses` và `question_options` cho câu trả lời dạng chọn.
 *
 * Khóa chính:
 * - (response_id, option_id): composite primary key.
 *
 * Ý nghĩa:
 * - Mỗi response có thể chọn 1 hoặc nhiều option tùy loại câu hỏi.
 */
import {
    Entity,
    PrimaryColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import QuizResponse from './quiz_response';
import QuestionOption from './question_option';

@Entity('quiz_response_options')
export default class QuizResponseOption {

    @PrimaryColumn()
    /** FK -> `quiz_responses.id`: response cha. */
    response_id: number;

    @PrimaryColumn()
    /** FK -> `question_options.id`: option được chọn. */
    option_id: number;

    @ManyToOne(() => QuizResponse)
    @JoinColumn({ name: 'response_id' })
    /** Quan hệ đến quiz response. */
    response: QuizResponse;

    @ManyToOne(() => QuestionOption)
    @JoinColumn({ name: 'option_id' })
    /** Quan hệ đến option được chọn. */
    option: QuestionOption;
}
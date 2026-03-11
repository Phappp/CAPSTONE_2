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
    response_id: number;

    @PrimaryColumn()
    option_id: number;

    @ManyToOne(() => QuizResponse)
    @JoinColumn({ name: 'response_id' })
    response: QuizResponse;

    @ManyToOne(() => QuestionOption)
    @JoinColumn({ name: 'option_id' })
    option: QuestionOption;
}
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
    response_id: number;

    @ManyToOne(() => QuizResponse)
    @JoinColumn({ name: 'response_id' })
    response: QuizResponse;

    @Column({ type: 'text' })
    answer_text: string;

    @Column({ type: 'text', nullable: true })
    ai_feedback: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    ai_score: number;
}
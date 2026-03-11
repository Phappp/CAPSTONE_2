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
    id: number;

    @Column()
    quiz_question_id: number;

    @ManyToOne(() => QuizQuestion)
    @JoinColumn({ name: 'quiz_question_id' })
    quizQuestion: QuizQuestion;

    @Column({ type: 'text' })
    option_text: string;

    @Column({ type: 'boolean', default: false })
    is_correct: boolean;

    @Column()
    order_index: number;

    @Column({ type: 'text', nullable: true })
    explanation: string;

    @CreateDateColumn()
    created_at: Date;
}
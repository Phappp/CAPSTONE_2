import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import QuizAttempt from './quiz_attempt';
import QuizQuestion from './quiz_question';

@Entity('quiz_responses')
export default class QuizResponse {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    attempt_id: number;

    @ManyToOne(() => QuizAttempt)
    @JoinColumn({ name: 'attempt_id' })
    attempt: QuizAttempt;

    @Column()
    quiz_question_id: number;

    @ManyToOne(() => QuizQuestion)
    @JoinColumn({ name: 'quiz_question_id' })
    quizQuestion: QuizQuestion;

    @Column({ type: 'boolean', nullable: true })
    is_correct: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    points_earned: number;

    @CreateDateColumn()
    created_at: Date;
}
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
    id: number;

    @Column()
    quiz_id: number;

    @ManyToOne(() => Quiz)
    @JoinColumn({ name: 'quiz_id' })
    quiz: Quiz;

    @Column()
    bank_question_id: number;

    @ManyToOne(() => BankQuestion)
    @JoinColumn({ name: 'bank_question_id' })
    bankQuestion: BankQuestion;

    @Column()
    order_index: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 1.0
    })
    points: number;

    @CreateDateColumn()
    created_at: Date;
}
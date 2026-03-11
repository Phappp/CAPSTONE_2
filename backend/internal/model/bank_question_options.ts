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
    id: number;

    @Column()
    question_id: number;

    @ManyToOne(() => BankQuestion)
    @JoinColumn({ name: 'question_id' })
    question: BankQuestion;

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
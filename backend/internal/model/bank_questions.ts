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
    id: number;

    @Column()
    bank_id: number;

    @ManyToOne(() => QuestionBank)
    @JoinColumn({ name: 'bank_id' })
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
    question_type: string;

    @Column({ type: 'text' })
    question_text: string;

    @Column({ type: 'text', nullable: true })
    explanation: string;

    @Column({
        type: 'enum',
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    })
    difficulty: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string;

    @Column({ type: 'json', nullable: true })
    tags: string[];

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 1.0
    })
    points: number;

    @Column()
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @Column({ type: 'boolean', default: false })
    is_ai_generated: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
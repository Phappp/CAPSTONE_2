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
    id: number;

    @Column()
    job_id: number;

    @ManyToOne(() => AIQuizGenerationJob)
    @JoinColumn({ name: 'job_id' })
    job: AIQuizGenerationJob;

    @Column({ nullable: true })
    bank_question_id: number;

    @ManyToOne(() => BankQuestion, { nullable: true })
    @JoinColumn({ name: 'bank_question_id' })
    bankQuestion: BankQuestion;

    @Column({ type: 'json' })
    question_data: object;

    @Column({ default: false })
    is_accepted: boolean;

    @Column({ type: 'text', nullable: true })
    feedback: string;

    @CreateDateColumn()
    created_at: Date;
}
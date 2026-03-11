import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Submission from './submissions';
import User from './user';

@Entity('submission_feedback')
export default class SubmissionFeedback {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    submission_id: number;

    @ManyToOne(() => Submission)
    @JoinColumn({ name: 'submission_id' })
    submission: Submission;

    @Column()
    grader_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'grader_id' })
    grader: User;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    score: number;

    @Column({ type: 'text', nullable: true })
    feedback_text: string;

    @Column({ type: 'boolean', default: false })
    is_auto_graded: boolean;

    @CreateDateColumn()
    graded_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
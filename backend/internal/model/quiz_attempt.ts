import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import Quiz from './quizze';
import User from './user';

@Entity('quiz_attempts')
@Unique(['quiz_id', 'user_id', 'attempt_number'])
export default class QuizAttempt {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    quiz_id: number;

    @ManyToOne(() => Quiz)
    @JoinColumn({ name: 'quiz_id' })
    quiz: Quiz;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    attempt_number: number;

    @CreateDateColumn()
    started_at: Date;

    @Column({ type: 'datetime', nullable: true })
    submitted_at: Date;

    @Column({ type: 'int', nullable: true })
    time_spent_seconds: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    score: number;

    @Column({ type: 'boolean', nullable: true })
    is_passed: boolean;

    @Column({
        type: 'enum',
        enum: ['in_progress', 'submitted', 'graded'],
        default: 'in_progress'
    })
    status: string;
}
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Lesson from './lesson';

@Entity('quizzes')
export default class Quiz {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'int', nullable: true })
    time_limit_minutes: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    passing_score: number;

    @Column({ type: 'int', default: 1 })
    max_attempts: number;

    @Column({ type: 'boolean', default: false })
    shuffle_questions: boolean;

    @Column({ type: 'boolean', default: false })
    shuffle_options: boolean;

    @Column({ type: 'boolean', default: true })
    show_results_immediately: boolean;

    @Column({ type: 'boolean', default: true })
    show_correct_answers: boolean;

    @Column({ type: 'int', nullable: true })
    random_question_count: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
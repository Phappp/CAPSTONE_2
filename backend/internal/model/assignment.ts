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

@Entity('assignments')
export default class Assignment {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'text', nullable: true })
    instructions: string;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    max_score: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    passing_score: number;

    @Column({ type: 'datetime', nullable: true })
    due_date: Date;

    @Column({ type: 'int', default: 0 })
    late_submission_days: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    })
    late_penalty_percent: number;

    @Column({ type: 'boolean', default: false })
    allow_resubmission: boolean;

    @Column({ type: 'int', default: 1 })
    max_resubmissions: number;

    @Column({ type: 'json', nullable: true })
    submission_format: any;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
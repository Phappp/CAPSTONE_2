import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Course from './course';

@Entity('grade_items')
export default class GradeItem {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({
        type: 'enum',
        enum: ['assignment', 'quiz', 'exam', 'participation']
    })
    item_type: string;

    @Column()
    item_id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

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
        default: 1.0
    })
    weight: number;

    @Column({ type: 'datetime', nullable: true })
    due_date: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Unique
} from 'typeorm';

import GradeItem from './grade_items';
import User from './user';

@Entity('grades')
@Unique(['grade_item_id', 'user_id'])
export default class Grade {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    grade_item_id: number;

    @ManyToOne(() => GradeItem)
    @JoinColumn({ name: 'grade_item_id' })
    gradeItem: GradeItem;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2
    })
    score: number;

    @Column({ type: 'text', nullable: true })
    feedback: string;

    @Column()
    graded_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'graded_by' })
    grader: User;

    @CreateDateColumn()
    graded_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
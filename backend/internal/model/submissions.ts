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

import Assignment from './assignment';
import User from './user';

@Entity('submissions')
@Unique(['assignment_id', 'user_id', 'resubmission_count'])
export default class Submission {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    assignment_id: number;

    @ManyToOne(() => Assignment)
    @JoinColumn({ name: 'assignment_id' })
    assignment: Assignment;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn()
    submitted_at: Date;

    @Column({ type: 'boolean', default: false })
    is_late: boolean;

    @Column({ type: 'int', default: 0 })
    resubmission_count: number;

    @Column({
        type: 'enum',
        enum: ['draft', 'submitted', 'graded', 'returned'],
        default: 'submitted'
    })
    status: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
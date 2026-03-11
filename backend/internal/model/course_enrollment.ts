import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import User from './user';
import Course from './course';

@Entity('course_enrollments')
@Unique(['user_id', 'course_id'])
export default class CourseEnrollment {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @CreateDateColumn()
    enrolled_at: Date;

    @Column({ nullable: true })
    enrolled_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'enrolled_by' })
    enrolledBy: User;

    @Column({
        type: 'enum',
        enum: ['active', 'completed', 'dropped', 'expired'],
        default: 'active'
    })
    status: string;

    @Column({ type: 'datetime', nullable: true })
    completed_at: Date;

    @Column({ type: 'datetime', nullable: true })
    last_accessed_at: Date;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    })
    progress_percent: number;
}
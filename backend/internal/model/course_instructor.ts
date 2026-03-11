import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import Course from './course';
import User from './user';

@Entity('course_instructors')
export default class CourseInstructor {

    @PrimaryColumn()
    course_id: number;

    @PrimaryColumn()
    instructor_id: number;

    @ManyToOne(() => Course, course => course.instructors)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'instructor_id' })
    instructor: User;

    @Column({ type: 'boolean', default: false })
    is_primary: boolean;

    @CreateDateColumn()
    assigned_at: Date;
}
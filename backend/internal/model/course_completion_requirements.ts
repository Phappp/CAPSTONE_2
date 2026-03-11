import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import Course from './course';

@Entity('course_completion_requirements')
export default class CourseCompletionRequirement {

    @PrimaryColumn()
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'boolean', default: true })
    require_all_lessons: boolean;

    @Column({ type: 'boolean', default: true })
    require_all_assignments: boolean;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    min_quiz_score: number;

    @Column({ type: 'boolean', default: false })
    require_final_exam: boolean;
}
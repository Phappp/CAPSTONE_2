import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Course from './course';
import Lesson from './lesson';

@Entity('modules')
export default class Module {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    course_id: number;

    @ManyToOne(() => Course, course => course.modules)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column()
    order_index: number;

    @Column({ type: 'boolean', default: true })
    is_published: boolean;

    @OneToMany(() => Lesson, lesson => lesson.module)
    lessons: Lesson[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
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
import User from './user';

@Entity('question_banks')
export default class QuestionBank {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column()
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @Column({ type: 'boolean', default: false })
    is_shared: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    JoinColumn
} from 'typeorm';
import User from './user';
import Module from './modules';
import CourseInstructor from './course_instructor';

@Entity('courses')
export default class Course {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    short_description: string;

    @Column({ type: 'text', nullable: true })
    full_description: string;

    @Column({ type: 'json', nullable: true })
    learning_objectives: string[];

    @Column({ type: 'json', nullable: true })
    prerequisites: string[];

    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail_url: string;

    @Column({
        type: 'enum',
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    })
    level: string;

    @Column({ type: 'varchar', length: 50, default: 'vi' })
    language: string;

    @Column({
        type: 'enum',
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    })
    status: string;

    @Column({ type: 'datetime', nullable: true })
    published_at: Date;

    @Column()
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @OneToMany(() => Module, module => module.course)
    modules: Module[];

    @OneToMany(() => CourseInstructor, ci => ci.course)
    instructors: CourseInstructor[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}
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
import Lesson from './lesson';

@Entity('lesson_completions')
@Unique(['user_id', 'lesson_id'])
export default class LessonCompletion {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    lesson_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @CreateDateColumn()
    completed_at: Date;

    @Column({ type: 'int', nullable: true })
    time_spent_seconds: number;
}
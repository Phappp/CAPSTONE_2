import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import User from './user';
import Course from './course';

@Entity('ai_chat_sessions')
export default class AIChatSession {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    course_id: number;

    @ManyToOne(() => Course, { nullable: true })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @CreateDateColumn()
    started_at: Date;

    @Column({ type: 'datetime', nullable: true })
    ended_at: Date;

    @Column({ default: 0 })
    message_count: number;

    @Column({ default: 0 })
    tokens_used: number;

    @Column({
        type: 'enum',
        enum: ['active', 'closed'],
        default: 'active'
    })
    status: string;
}
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import LiveSession from './live_session';
import User from './user';

@Entity('attendance')
@Unique(['session_id', 'user_id'])
export default class Attendance {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    session_id: number;

    @ManyToOne(() => LiveSession)
    @JoinColumn({ name: 'session_id' })
    session: LiveSession;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn()
    joined_at: Date;

    @Column({ type: 'datetime', nullable: true })
    left_at: Date;

    @Column({ type: 'int', nullable: true })
    duration_seconds: number;

    @Column({
        type: 'enum',
        enum: ['present', 'late', 'absent'],
        default: 'present'
    })
    status: string;
}
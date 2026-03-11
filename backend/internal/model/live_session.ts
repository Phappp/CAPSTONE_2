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

@Entity('live_sessions')
export default class LiveSession {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    course_id: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'datetime' })
    start_time: Date;

    @Column({ type: 'datetime' })
    end_time: Date;

    @Column({ type: 'varchar', length: 500 })
    meeting_url: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    recording_url: string;

    @Column({
        type: 'enum',
        enum: ['scheduled', 'ongoing', 'ended', 'cancelled'],
        default: 'scheduled'
    })
    status: string;

    @Column()
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
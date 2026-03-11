import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import LiveSession from './live_session';

@Entity('session_recordings')
export default class SessionRecording {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    session_id: number;

    @ManyToOne(() => LiveSession)
    @JoinColumn({ name: 'session_id' })
    session: LiveSession;

    @Column({ type: 'varchar', length: 500 })
    recording_url: string;

    @Column({ type: 'int', nullable: true })
    duration_minutes: number;

    @CreateDateColumn()
    uploaded_at: Date;
}
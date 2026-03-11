/**
 * Entity: `session_recordings`
 * Mục đích: Lưu thông tin recording của một buổi live session.
 *
 * Cột chính:
 * - session_id: FK -> live_sessions
 * - recording_url: link recording
 * - duration_minutes: (nullable) thời lượng recording (phút)
 * - uploaded_at: thời điểm upload/ghi nhận recording
 */
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
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `live_sessions.id`: buổi live tương ứng. */
    session_id: number;

    @ManyToOne(() => LiveSession)
    @JoinColumn({ name: 'session_id' })
    /** Quan hệ đến live session. */
    session: LiveSession;

    @Column({ type: 'varchar', length: 500 })
    /** URL recording. */
    recording_url: string;

    @Column({ type: 'int', nullable: true })
    /** Thời lượng recording (phút) (nullable). */
    duration_minutes: number;

    @CreateDateColumn()
    /** Thời điểm upload/ghi nhận. */
    uploaded_at: Date;
}
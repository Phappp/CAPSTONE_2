/**
 * Entity: `live_sessions`
 * Mục đích: Lưu thông tin các buổi học live qua Jitsi Meet.
 *
 * Quan hệ chính:
 * - course_id -> courses: khóa học mà buổi live thuộc về
 * - host_id -> users: giảng viên tạo buổi live
 *
 * Cột chính:
 * - title/description: thông tin buổi live
 * - jitsi_room_name: tên phòng Jitsi (dùng để join)
 * - status: scheduled | live | ended
 * - scheduled_at: thời gian lên lịch (nullable)
 * - started_at/ended_at: thời gian bắt đầu/kết thúc thực tế
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn
} from 'typeorm';
import Course from './course';
import User from './user';

export type LiveSessionStatus = 'scheduled' | 'live' | 'ended';

@Entity('live_sessions')
export default class LiveSession {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'int' })
    /** FK -> `courses.id`: khóa học mà buổi live thuộc về. */
    courseId: number;

    @ManyToOne(() => Course)
    @JoinColumn({ name: 'courseId' })
    /** Quan hệ đến khóa học. */
    course: Course;

    @Column({ type: 'varchar', length: 255 })
    /** Tiêu đề buổi live. */
    title: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả buổi live (nullable). */
    description: string;

    @Column({ type: 'int' })
    /** FK -> `users.id`: giảng viên tạo buổi live. */
    hostId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'hostId' })
    /** Quan hệ đến giảng viên. */
    host: User;

    @Column({ type: 'varchar', length: 255, unique: true })
    /** Tên phòng Jitsi (unique để tránh trùng). */
    jitsiRoomName: string;

    @Column({ type: 'datetime', nullable: true })
    /** Thời gian lên lịch (nullable nếu không có lịch cụ thể). */
    scheduledAt: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm bắt đầu thực tế (nullable nếu chưa bắt đầu). */
    startedAt: Date;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm kết thúc (nullable nếu chưa kết thúc). */
    endedAt: Date;

    @Column({
        type: 'enum',
        enum: ['scheduled', 'live', 'ended'],
        default: 'scheduled'
    })
    /** Trạng thái: scheduled = chưa bắt đầu, live = đang diễn ra, ended = đã kết thúc. */
    status: LiveSessionStatus;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    createdAt: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updatedAt: Date;
}

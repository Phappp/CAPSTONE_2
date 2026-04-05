// bảng chính lưu trữ thông báo cho người dùng.
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('notifications')
export default class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    user_id: number; // ID người nhận thông báo

    @Column({ type: 'int' })
    type_id: number; // Liên kết với bảng notification_types

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'json', nullable: true })
    data: any; // Lưu thông tin bổ sung như assignment_id, score

    @Column({ type: 'tinyint', default: 0 })
    is_read: number; // 0: Chưa đọc, 1: Đã đọc

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
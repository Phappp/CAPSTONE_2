// bảng danh mục các loại thông báo.
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('notification_types')
export default class NotificationType {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    name: string; 

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
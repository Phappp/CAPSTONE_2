import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('roles')
export default class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string;

    // Dùng timestamp để tránh lỗi "Invalid default value" trên một số cấu hình MySQL
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
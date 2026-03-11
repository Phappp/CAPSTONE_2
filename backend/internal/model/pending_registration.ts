import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('pending_registrations')
export default class PendingRegistration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    full_name: string;

    @Column({ type: 'varchar', length: 255 })
    password_hash: string;

    @Column({ type: 'varchar', length: 50 })
    role_name: string;

    @Column({ type: 'varchar', length: 10 })
    code: string;

    @Column({ type: 'timestamp' })
    expires_at: Date;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}


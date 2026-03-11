import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import User from './user';

@Entity('email_verifications')
export default class EmailVerification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 10 })
    code: string;

    @Column({ type: 'timestamp' })
    expires_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    used_at: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}




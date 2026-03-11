import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    PrimaryColumn,
    CreateDateColumn,
} from 'typeorm';
import User from './user';
import Role from './role';

@Entity('user_roles')
export default class UserRole {
    @PrimaryColumn()
    user_id: number;

    @PrimaryColumn()
    role_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ type: 'int', nullable: true })
    assigned_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'assigned_by' })
    assignedBy: User;

    @CreateDateColumn({ type: 'timestamp'})
    assigned_at: Date;
}
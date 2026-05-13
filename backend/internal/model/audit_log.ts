import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import User from './user';

/**
 * Entity: `audit_logs`
 * Ghi lại các hành động quản trị quan trọng (user management, v.v.).
 */
@Entity('audit_logs')
export default class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  actor_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actor_user: User;

  @Column({ type: 'int', nullable: true })
  target_user_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  target_user: User | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}


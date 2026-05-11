import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import LessonResource from './lesson_resource';
import User from './user';

@Entity('lesson_resource_review_events')
export default class LessonResourceReviewEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  resource_id: number;

  @ManyToOne(() => LessonResource)
  @JoinColumn({ name: 'resource_id' })
  resource: LessonResource;

  @Column({ type: 'bigint' })
  actor_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actor_user: User;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], nullable: true })
  from_status: string | null;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'] })
  to_status: string;

  @Column({ type: 'enum', enum: ['submit', 'approve', 'reject', 'resubmit'] })
  decision: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  created_at: Date;
}


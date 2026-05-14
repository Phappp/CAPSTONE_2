import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import Course from './course';
import User from './user';

@Entity('course_review_events')
export default class CourseReviewEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  course_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'int' })
  actor_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actor_user: User;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending_review', 'published', 'archived'],
    nullable: true,
  })
  from_status: string | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending_review', 'published', 'archived'],
  })
  to_status: string;

  @Column({
    type: 'enum',
    enum: ['submit', 'approve', 'reject', 'resubmit'],
  })
  decision: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

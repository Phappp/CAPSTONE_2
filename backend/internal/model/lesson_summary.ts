import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import Lesson from './lesson';

@Entity('lesson_summaries')
@Index('ux_lesson_summaries_lesson_id', ['lesson_id'], { unique: true })
@Index('idx_lesson_summaries_status', ['status'])
export default class LessonSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  lesson_id: number;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'succeeded', 'failed'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'enum', enum: ['text', 'youtube', 'uploaded_video'], default: 'uploaded_video' })
  source_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source_hash: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  model: string | null;

  @Column({ type: 'text', nullable: true })
  overall_summary: string | null;

  @Column({ type: 'json', nullable: true })
  key_points_json: string[] | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'datetime', nullable: true })
  requested_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  finished_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

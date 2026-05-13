import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import LessonSummary from './lesson_summary';

@Entity('lesson_summary_segments')
@Index('idx_lesson_summary_segments_summary_index', ['summary_id', 'segment_index'], { unique: true })
export default class LessonSummarySegment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  summary_id: number;

  @ManyToOne(() => LessonSummary)
  @JoinColumn({ name: 'summary_id' })
  summary: LessonSummary;

  @Column({ type: 'int' })
  segment_index: number;

  @Column({ type: 'int', nullable: true })
  start_sec: number | null;

  @Column({ type: 'int', nullable: true })
  end_sec: number | null;

  @Column({ type: 'mediumtext', nullable: true })
  raw_text: string | null;

  @Column({ type: 'text', nullable: true })
  summary_text: string | null;

  @Column({ type: 'json', nullable: true })
  keywords_json: string[] | null;

  @CreateDateColumn()
  created_at: Date;
}

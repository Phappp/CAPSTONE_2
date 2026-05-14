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

export const LESSON_TRANSCRIPT_SOURCE_TYPES = ['youtube_timedtext', 'youtube_stt', 'uploaded_video'] as const;
export type LessonTranscriptSourceType = typeof LESSON_TRANSCRIPT_SOURCE_TYPES[number];

@Entity('lesson_transcript_caches')
@Index('ux_lesson_transcript_caches_lesson_source', ['lesson_id', 'source_type'], { unique: true })
export default class LessonTranscriptCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  lesson_id: number;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'enum', enum: LESSON_TRANSCRIPT_SOURCE_TYPES, default: 'youtube_timedtext' })
  source_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source_hash: string | null;

  @Column({ type: 'mediumtext', nullable: true })
  transcript_text: string | null;

  @Column({ type: 'json', nullable: true })
  transcript_segments_json: Array<{ start_sec: number; end_sec: number; text: string }> | null;

  @Column({ type: 'datetime', nullable: true })
  transcript_fetched_at: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

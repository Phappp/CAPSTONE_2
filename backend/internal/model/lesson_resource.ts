import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

import Lesson from './lesson';

@Entity('lesson_resources')
export default class LessonResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  lesson_id: number;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'enum', enum: ['file', 'video'], default: 'file' })
  resource_type: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  preview_url: string;

  @Column({ type: 'int', nullable: true })
  size_bytes: number;

  @Column({
    type: 'enum',
    enum: ['pdf', 'word', 'video', 'youtube', 'other'],
    default: 'other',
  })
  resource_kind: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  })
  review_status: string;

  @Column({
    type: 'enum',
    enum: ['add', 'update', 'delete'],
    default: 'add',
  })
  review_decision: string;

  @Column({ type: 'text', nullable: true })
  review_reason: string;

  @Column({ type: 'bigint', nullable: true })
  reviewed_by: number | null;

  @Column({ type: 'datetime', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}


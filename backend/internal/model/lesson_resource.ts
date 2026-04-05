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

  @CreateDateColumn()
  created_at: Date;
}


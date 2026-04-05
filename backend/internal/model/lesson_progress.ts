/**
 * Entity: `lesson_progress`
 * Mục đích: Tích lũy thời gian học của user theo lesson trong một course.
 *
 * Ràng buộc:
 * - Unique(user_id, course_id, lesson_id): một user có tối đa 1 bản ghi progress cho 1 lesson trong 1 course.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import User from './user';
import Course from './course';
import Lesson from './lesson';

@Entity('lesson_progress')
@Unique(['user_id', 'course_id', 'lesson_id'])
export default class LessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  course_id: number;

  @Column()
  lesson_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'int', default: 0 })
  time_spent_seconds: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


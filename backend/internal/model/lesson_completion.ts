/**
 * Entity: `lesson_completions`
 * Mục đích: Lưu trạng thái hoàn thành lesson của user.
 *
 * Ràng buộc:
 * - Unique(user_id, lesson_id): một user chỉ có 1 bản ghi completion cho 1 lesson.
 *
 * Cột chính:
 * - user_id / lesson_id: FK đến user & lesson
 * - completed_at: thời điểm hoàn thành
 * - time_spent_seconds: (nullable) thời gian học (giây)
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique
} from 'typeorm';

import User from './user';
import Lesson from './lesson';

@Entity('lesson_completions')
@Unique(['user_id', 'lesson_id'])
export default class LessonCompletion {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `users.id`: user hoàn thành lesson. */
    user_id: number;

    @Column()
    /** FK -> `lessons.id`: lesson được hoàn thành. */
    lesson_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user. */
    user: User;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    /** Quan hệ đến lesson. */
    lesson: Lesson;

    @CreateDateColumn()
    /** Thời điểm hoàn thành lesson. */
    completed_at: Date;

    @Column({ type: 'int', nullable: true })
    /** Thời gian học (giây) (nullable). */
    time_spent_seconds: number;
}
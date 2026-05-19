/**
 * Entity: `lesson_discussions`
 * Mục đích: Thread thảo luận cho bài học (lesson).
 *
 * Cột chính:
 * - lesson_id: FK -> lessons
 * - user_id: FK -> users (người tạo thread)
 * - title: tiêu đề thread
 * - content: nội dung
 * - is_pinned: ghim lên đầu
 * - is_resolved: đánh dấu đã giải quyết
 * - reply_count: số lượng reply
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

import Lesson from './lesson';
import User from './user';
import LessonDiscussionReply from './lesson_discussion_reply';

@Entity('lesson_discussions')
@Index('idx_lesson_discussions_lesson_id', ['lessonId'])
@Index('idx_lesson_discussions_user_id', ['userId'])
@Index('idx_lesson_discussions_created_at', ['createdAt'])
export default class LessonDiscussion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'lesson_id' })
    lessonId: number;

    @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'is_pinned', type: 'boolean', default: false })
    isPinned: boolean;

    @Column({ name: 'is_resolved', type: 'boolean', default: false })
    isResolved: boolean;

    @Column({ name: 'view_count', type: 'int', default: 0 })
    viewCount: number;

    @Column({ name: 'reply_count', type: 'int', default: 0 })
    replyCount: number;

    @OneToMany(() => LessonDiscussionReply, reply => reply.discussion)
    replies: LessonDiscussionReply[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

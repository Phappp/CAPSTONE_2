/**
 * Entity: `lesson_discussion_replies`
 * Mục đích: Reply cho thread thảo luận bài học.
 *
 * Cột chính:
 * - discussion_id: FK -> lesson_discussions
 * - user_id: FK -> users
 * - parent_reply_id: FK -> lesson_discussion_replies (cho reply lồng nhau)
 * - content: nội dung reply
 * - is_instructor_reply: đánh dấu là reply của giảng viên
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

import LessonDiscussion from './lesson_discussion';
import User from './user';

@Entity('lesson_discussion_replies')
@Index('idx_lesson_discussion_replies_discussion_id', ['discussionId'])
@Index('idx_lesson_discussion_replies_user_id', ['userId'])
@Index('idx_lesson_discussion_replies_parent_id', ['parentReplyId'])
export default class LessonDiscussionReply {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'discussion_id' })
    discussionId: number;

    @ManyToOne(() => LessonDiscussion, discussion => discussion.replies, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discussion_id' })
    discussion: LessonDiscussion;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'parent_reply_id', nullable: true })
    parentReplyId: number | null;

    @ManyToOne(() => LessonDiscussionReply, reply => reply.childReplies, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parent_reply_id' })
    parentReply: LessonDiscussionReply | null;

    @OneToMany(() => LessonDiscussionReply, reply => reply.parentReply)
    childReplies: LessonDiscussionReply[];

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'is_instructor_reply', type: 'boolean', default: false })
    isInstructorReply: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

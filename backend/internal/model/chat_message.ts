import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';

import User from './user';
import AIChatSession from './ai_chat_session';

/**
 * Entity: `chat_messages`
 * Mục đích: Lưu từng message trong một phiên chat AI (`ai_chat_sessions`).
 *
 * Cột chính:
 * - session_id: phiên chat
 * - user_id: user tạo message (có thể là user hệ thống nếu cần)
 * - role: vai trò message (user/assistant/system)
 * - content: nội dung message
 * - created_at: thời điểm tạo message
 */
@Entity('chat_messages')
export default class ChatMessage {
    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `ai_chat_sessions.id`: phiên chat chứa message. */
    session_id: number;

    @ManyToOne(() => AIChatSession)
    @JoinColumn({ name: 'session_id' })
    /** Quan hệ đến AI chat session. */
    session: AIChatSession;

    @Column()
    /** FK -> `users.id`: người gửi message. */
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    /** Quan hệ đến user gửi message. */
    user: User;

    @Column({
        type: 'enum',
        enum: ['user', 'assistant', 'system'],
        default: 'user',
    })
    /** Vai trò message trong hội thoại. */
    role: string;

    @Column({ type: 'text' })
    /** Nội dung message. */
    content: string;

    /** Thời điểm message được tạo. */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
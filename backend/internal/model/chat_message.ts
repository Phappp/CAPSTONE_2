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

// Bảng lưu từng message trong một AI chat session
@Entity('chat_messages')
export default class ChatMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    session_id: number;

    @ManyToOne(() => AIChatSession)
    @JoinColumn({ name: 'session_id' })
    session: AIChatSession;

    @Column()
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'enum',
        enum: ['user', 'assistant', 'system'],
        default: 'user',
    })
    role: string;

    @Column({ type: 'text' })
    content: string;

    // Thời điểm message được tạo
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
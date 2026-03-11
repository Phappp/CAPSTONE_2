import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import User from './user';
import ContentItem from './content_items';

@Entity('ai_quiz_generation_jobs')
export default class AIQuizGenerationJob {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    requested_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requested_by' })
    requester: User;

    @Column()
    content_item_id: number;

    @ManyToOne(() => ContentItem)
    @JoinColumn({ name: 'content_item_id' })
    contentItem: ContentItem;

    @Column({
        type: 'enum',
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    })
    status: string;

    @Column({ type: 'json', nullable: true })
    parameters: object;

    @Column({ type: 'json', nullable: true })
    result_summary: object;

    @CreateDateColumn()
    created_at: Date;

    @Column({ type: 'datetime', nullable: true })
    completed_at: Date;
}
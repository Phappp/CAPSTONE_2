import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Lesson from './lesson';
import ContentType from './content_type';

@Entity('content_items')
export default class ContentItem {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column()
    content_type_id: number;

    @ManyToOne(() => ContentType)
    @JoinColumn({ name: 'content_type_id' })
    contentType: ContentType;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'json' })
    content_data: any;

    @Column()
    order_index: number;

    @Column({ type: 'boolean', default: false })
    is_required: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
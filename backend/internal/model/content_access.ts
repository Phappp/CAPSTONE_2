import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from 'typeorm';

import ContentItem from './content_items';
import Lesson from './lesson';

@Entity('content_access')
export default class ContentAccess {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content_item_id: number;

    @ManyToOne(() => ContentItem)
    @JoinColumn({ name: 'content_item_id' })
    contentItem: ContentItem;

    @Column({ nullable: true })
    required_lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'required_lesson_id' })
    requiredLesson: Lesson;

    @Column({ type: 'boolean', default: true })
    required_completion: boolean;

    @Column({ type: 'int', nullable: true })
    min_time_seconds: number;
}
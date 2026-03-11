import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Module from './modules';

@Entity('lessons')
export default class Lesson {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    module_id: number;

    @ManyToOne(() => Module, module => module.lessons)
    @JoinColumn({ name: 'module_id' })
    module: Module;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column()
    order_index: number;

    @Column({ type: 'int', nullable: true })
    duration_minutes: number;

    @Column({ type: 'boolean', default: true })
    is_published: boolean;

    @Column({ type: 'boolean', default: false })
    is_free_preview: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
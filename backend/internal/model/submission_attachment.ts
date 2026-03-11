import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from 'typeorm';

import Submission from './submissions';

@Entity('submission_attachments')
export default class SubmissionAttachment {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    submission_id: number;

    @ManyToOne(() => Submission)
    @JoinColumn({ name: 'submission_id' })
    submission: Submission;

    @Column({ type: 'varchar', length: 255 })
    file_name: string;

    @Column({ type: 'varchar', length: 500 })
    file_path: string;

    @Column({ type: 'int' })
    file_size: number;

    @Column({ type: 'varchar', length: 100 })
    mime_type: string;

    @CreateDateColumn()
    uploaded_at: Date;
}
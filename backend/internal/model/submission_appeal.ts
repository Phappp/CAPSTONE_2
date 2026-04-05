import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('submission_appeals')
export class SubmissionAppeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'submission_id' })
  submissionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
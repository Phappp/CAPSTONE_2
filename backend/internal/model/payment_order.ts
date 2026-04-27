import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import User from './user';
import Course from './course';

@Entity('payment_orders')
@Index('idx_payment_orders_user_course_status', ['user_id', 'course_id', 'status'])
@Index('ux_payment_orders_provider_order_ref', ['provider_order_ref'], { unique: true })
export default class PaymentOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  course_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar', length: 40 })
  provider: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'failed', 'expired', 'refunded'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider_order_ref: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider_txn_ref: string | null;

  @Column({ type: 'json', nullable: true })
  raw_return_payload: Record<string, unknown> | null;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expired_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


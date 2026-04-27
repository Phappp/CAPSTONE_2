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
import PaymentOrder from './payment_order';

@Entity('payment_revenue_ledger')
@Index('ux_payment_revenue_ledger_order_id', ['order_id'], { unique: true })
@Index('idx_payment_revenue_ledger_teacher_date', ['teacher_user_id', 'recognized_at'])
@Index('idx_payment_revenue_ledger_course_date', ['course_id', 'recognized_at'])
export default class PaymentRevenueLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  order_id: number;

  @ManyToOne(() => PaymentOrder)
  @JoinColumn({ name: 'order_id' })
  order: PaymentOrder;

  @Column({ type: 'int' })
  course_id: number;

  @Column({ type: 'int' })
  teacher_user_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  system_fee_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: number;

  @Column({ type: 'int' })
  system_fee_rate_bps: number;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'datetime' })
  recognized_at: Date;

  @Column({
    type: 'enum',
    enum: ['recognized', 'reversed'],
    default: 'recognized',
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  reversed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

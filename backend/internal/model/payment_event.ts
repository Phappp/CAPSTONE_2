import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import PaymentOrder from './payment_order';

@Entity('payment_events')
@Index('idx_payment_events_order_id', ['order_id'])
export default class PaymentEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  order_id: number;

  @ManyToOne(() => PaymentOrder)
  @JoinColumn({ name: 'order_id' })
  order: PaymentOrder;

  @Column({ type: 'varchar', length: 80 })
  event_type: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}


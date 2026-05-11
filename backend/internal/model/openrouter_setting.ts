import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import User from './user';

@Entity('openrouter_settings')
export default class OpenRouterSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  api_key_encrypted: string | null;

  @Column({ type: 'json', nullable: true })
  models: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  default_model: string | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

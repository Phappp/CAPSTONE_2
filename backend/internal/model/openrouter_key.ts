import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('openrouter_keys')
export default class OpenRouterKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  key_encrypted: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'datetime', nullable: true })
  cooldown_until: Date | null;

  @Column({ type: 'int', default: 0 })
  error_count: number;

  @Column({ type: 'datetime', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  last_error_at: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  last_test_status: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_test_message: string | null;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

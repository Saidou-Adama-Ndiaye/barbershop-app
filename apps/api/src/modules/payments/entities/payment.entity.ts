import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
}

export enum PaymentProvider {
  WAVE         = 'wave',
  ORANGE_MONEY = 'orange_money',
  CARD         = 'card',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string; // 'booking' | 'order' | 'formation'

  @Index()
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ length: 50, default: PaymentProvider.WAVE })
  provider: string;

  @Index()
  @Column({ length: 50, default: PaymentStatus.PENDING })
  status: string;

  @Column({
    name: 'provider_transaction_id',
    length: 255,
    nullable: true,
  })
  providerTransactionId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
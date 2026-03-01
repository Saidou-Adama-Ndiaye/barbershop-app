// .\.\apps\api\src\modules\orders\entities\order-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Pack } from '../../packs/entities/pack.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'pack_id', nullable: true })
  packId: string;

  @Column({ name: 'pack_snapshot', type: 'jsonb' })
  packSnapshot: Record<string, unknown>;

  @Column({ default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'jsonb', default: {} })
  customizations: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Pack, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pack_id' })
  pack: Pack;
}
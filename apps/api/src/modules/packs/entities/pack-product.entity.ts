import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pack } from './pack.entity';
import { Product } from './product.entity';

@Entity('pack_products')
export class PackProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pack_id' })
  packId: string;

  @Index()
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ name: 'is_optional', default: false })
  isOptional: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  // ─── Relations ────────────────────────────────────────────

  @ManyToOne(() => Pack, (pack) => pack.packProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pack_id' })
  pack: Pack;

  @ManyToOne(() => Product, (product) => product.packProducts, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
// .\.\apps\api\src\modules\packs\entities\product.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from './category.entity';
import { PackProduct } from './pack-product.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: 'stock_qty', default: 0 })
  stockQty: number;

  @Index()
  @Column({ length: 100, unique: true, nullable: true })
  sku: string;

  @Column({ name: 'image_urls', type: 'text', array: true, default: [] })
  imageUrls: string[];

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => PackProduct, (pp) => pp.product)
  packProducts: PackProduct[];
}
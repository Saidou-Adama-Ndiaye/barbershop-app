// .\.\apps\api\src\modules\packs\entities\pack.entity.ts
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

@Entity('packs')
export class Pack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Index()
  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2 })
  basePrice: number;

  @Column({
    name: 'discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPct: number;

  @Column({ name: 'image_urls', type: 'text', array: true, default: [] })
  imageUrls: string[];

  @Column({ name: 'is_customizable', default: true })
  isCustomizable: boolean;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => PackProduct, (pp) => pp.pack, { cascade: true })
  packProducts: PackProduct[];
}
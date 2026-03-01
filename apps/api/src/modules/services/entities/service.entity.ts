// .\.\apps\api\src\modules\services\entities\service.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'duration_min' })
  durationMin: number;

  @Column({
    name: 'deposit_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 30,
  })
  depositPct: number;

  @Column({ type: 'text', array: true, default: [] })
  inclusions: string[];

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
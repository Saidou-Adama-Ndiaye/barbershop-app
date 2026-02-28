import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Formation } from './formation.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'formation_id' })
  formationId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ⚠️ JAMAIS exposé directement au client — clé MinIO uniquement
  @Column({ name: 'storage_key', type: 'text', select: false })
  storageKey: string;

  @Column({ name: 'duration_sec', default: 0 })
  durationSec: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_free_preview', default: false })
  isFreePreview: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────
  @ManyToOne(() => Formation, (f) => f.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formation_id' })
  formation: Formation;
}
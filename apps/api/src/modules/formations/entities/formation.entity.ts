// .\.\apps\api\src\modules\formations\entities\formation.entity.ts
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FormationLevel {
  DEBUTANT      = 'debutant',
  INTERMEDIAIRE = 'intermediaire',
  AVANCE        = 'avance',
}

@Entity('formations')
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Index()
  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ name: 'instructor_id' })
  instructorId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'trailer_url', type: 'text', nullable: true })
  trailerUrl: string;

  @Column({ name: 'duration_min', default: 0 })
  durationMin: number;

  @Index()
  @Column({
    type: 'enum',
    enum: FormationLevel,
    default: FormationLevel.DEBUTANT,
  })
  level: FormationLevel;

  @Column({ length: 10, default: 'fr' })
  language: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Index()
  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'total_enrolled', default: 0 })
  totalEnrolled: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  avgRating: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @OneToMany(() => Video, (video) => video.formation, { cascade: true })
  videos: Video[];
}

// Import circulaire évité — Video importé ici
import { Video } from './video.entity';
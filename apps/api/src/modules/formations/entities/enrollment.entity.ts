import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Formation } from './formation.entity';

@Entity('enrollments')
@Unique(['userId', 'formationId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Index()
  @Column({ name: 'formation_id' })
  formationId: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string;

  @CreateDateColumn({ name: 'enrolled_at', type: 'timestamptz' })
  enrolledAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl: string;

  // ─── Relations ──────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Formation, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'formation_id' })
  formation: Formation;
}
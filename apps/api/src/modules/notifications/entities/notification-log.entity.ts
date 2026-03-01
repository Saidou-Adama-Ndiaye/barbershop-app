// .\.\apps\api\src\modules\notifications\entities\notification-log.entity.ts
import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ length: 100, default: 'email' })
  type: string;

  @Column({ length: 100, nullable: true })
  template: string;

  @Column({ length: 255 })
  recipient: string;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ length: 50, default: 'sent' })
  status: string;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'NOW()' })
  sentAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
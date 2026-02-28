import {
  Entity, Column, PrimaryGeneratedColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Video } from './video.entity';

@Entity('video_progress')
@Unique(['userId', 'videoId'])
export class VideoProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Index()
  @Column({ name: 'video_id' })
  videoId: string;

  @Column({ name: 'watched_sec', default: 0 })
  watchedSec: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'last_watched', type: 'timestamptz', default: () => 'NOW()' })
  lastWatched: Date;

  // ─── Relations ──────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
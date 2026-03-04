// apps\api\src\modules\bookings\entities\booking.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';

export enum BookingStatus {
  PENDING      = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  CONFIRMED    = 'confirmed',
  IN_PROGRESS  = 'in_progress',
  COMPLETED    = 'completed',
  CANCELLED    = 'cancelled',
  NO_SHOW      = 'no_show',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'booking_number', length: 50, unique: true })
  bookingNumber: string;

  @Index()
  @Column({ name: 'client_id' })
  clientId: string;

  @Index()
  @Column({ name: 'staff_id' })
  staffId: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Index()
  @Column({ name: 'booked_at', type: 'timestamptz' })
  bookedAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({
    name: 'deposit_paid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  depositPaid: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ─── Notes privées du coiffeur (invisibles au client) ─
  @Column({ name: 'staff_notes', type: 'text', nullable: true })
  staffNotes: string | null;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ──────────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
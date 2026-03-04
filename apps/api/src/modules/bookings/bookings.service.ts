// apps\api\src\modules\bookings\bookings.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { StaffAvailability } from './entities/staff-availability.entity';
import { Service } from '../services/entities/service.entity';
import { AuditService } from '../audit/audit.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { UserRole } from '../users/entities/user.entity';

// ─── Types internes ───────────────────────────────────────
export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface AvailabilityResult {
  date: string;
  staffId: string;
  serviceId: string;
  durationMin: number;
  slots: TimeSlot[];
}

// ─── Transitions autorisées par rôle ─────────────────────
const COIFFEUR_STATUS_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.DEPOSIT_PAID]: [BookingStatus.CONFIRMED],
  [BookingStatus.CONFIRMED]:    [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  [BookingStatus.IN_PROGRESS]:  [BookingStatus.COMPLETED],
};

const ADMIN_STATUS_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.PENDING]:      [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.DEPOSIT_PAID]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]:    [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  [BookingStatus.IN_PROGRESS]:  [BookingStatus.COMPLETED],
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(StaffAvailability)
    private readonly availabilityRepository: Repository<StaffAvailability>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly auditService: AuditService,
  ) {}

  // ─── GET /bookings/availability ───────────────────────
  async getAvailableSlots(
    staffId: string,
    date: string,
    serviceId: string,
  ): Promise<AvailabilityResult> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service introuvable');

    const targetDate = new Date(date);
    const dayOfWeek  = targetDate.getDay();

    const availability = await this.availabilityRepository.findOne({
      where: { staffId, dayOfWeek, isActive: true },
    });

    if (!availability) {
      return { date, staffId, serviceId, durationMin: service.durationMin, slots: [] };
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd   = new Date(`${date}T23:59:59.999Z`);

    const occupiedBookings = await this.bookingRepository.find({
      where: [
        { staffId, bookedAt: Between(dayStart, dayEnd), status: BookingStatus.PENDING },
        { staffId, bookedAt: Between(dayStart, dayEnd), status: BookingStatus.DEPOSIT_PAID },
        { staffId, bookedAt: Between(dayStart, dayEnd), status: BookingStatus.CONFIRMED },
      ],
    });

    const slots = this.generateSlots(
      date,
      availability.startTime,
      availability.endTime,
      service.durationMin,
      occupiedBookings,
    );

    return { date, staffId, serviceId, durationMin: service.durationMin, slots };
  }

  // ─── Générateur de créneaux ───────────────────────────
  private generateSlots(
    date: string,
    startTime: string,
    endTime: string,
    durationMin: number,
    existingBookings: Booking[],
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM]     = endTime.split(':').map(Number);

    let current = startH * 60 + startM;
    const end   = endH * 60 + endM;

    while (current + durationMin <= end) {
      const slotStart = new Date(`${date}T${this.minutesToTime(current)}:00.000Z`);
      const slotEnd   = new Date(`${date}T${this.minutesToTime(current + durationMin)}:00.000Z`);

      const isOccupied = existingBookings.some((booking) => {
        const bStart = new Date(booking.bookedAt).getTime();
        const bEnd   = new Date(booking.endAt).getTime();
        const sStart = slotStart.getTime();
        const sEnd   = slotEnd.getTime();
        return sStart < bEnd && sEnd > bStart;
      });

      slots.push({
        start:     slotStart.toISOString(),
        end:       slotEnd.toISOString(),
        available: !isOccupied,
      });

      current += durationMin;
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // ─── POST /bookings ───────────────────────────────────
  async createBooking(
    clientId: string,
    dto: CreateBookingDto,
  ): Promise<{ booking: Booking; depositAmount: number; payment: Record<string, unknown> }> {
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service introuvable');

    const bookedAt = new Date(dto.bookedAt);
    const endAt    = new Date(bookedAt.getTime() + service.durationMin * 60 * 1000);

    const conflictCheck = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.staff_id = :staffId', { staffId: dto.staffId })
      .andWhere('booking.status NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      })
      .andWhere(
        '(booking.booked_at < :endAt AND booking.end_at > :bookedAt)',
        { bookedAt: bookedAt.toISOString(), endAt: endAt.toISOString() },
      )
      .getOne();

    if (conflictCheck) {
      throw new ConflictException('Ce créneau est déjà réservé. Veuillez choisir un autre horaire.');
    }

    const depositAmount = Math.round(
      (Number(service.price) * Number(service.depositPct)) / 100,
    );

    const bookingNumber = await this.generateBookingNumber();

    const booking = this.bookingRepository.create({
      bookingNumber,
      clientId,
      staffId:     dto.staffId,
      serviceId:   dto.serviceId,
      bookedAt,
      endAt,
      totalPrice:  Number(service.price),
      depositPaid: 0,
      notes:       dto.notes,
      status:      BookingStatus.PENDING,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    this.auditService.log({
      userId:     clientId,
      action:     'CREATE_BOOKING',
      entityType: 'Booking',
      entityId:   savedBooking.id,
      metadata:   { bookingNumber, serviceId: dto.serviceId, depositAmount },
    });

    return {
      booking: savedBooking,
      depositAmount,
      payment: {
        amount:      depositAmount,
        currency:    'XOF',
        entityType:  'booking',
        entityId:    savedBooking.id,
        bookingNumber,
      },
    };
  }

  // ─── GET /bookings ────────────────────────────────────
  async findAll(userId: string, userRole: UserRole): Promise<Booking[]> {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .orderBy('booking.bookedAt', 'DESC');

    if (userRole === UserRole.CLIENT) {
      qb.where('booking.clientId = :userId', { userId });
    } else if (userRole === UserRole.COIFFEUR) {
      qb.where('booking.staffId = :userId', { userId });
    }

    return qb.getMany();
  }

  // ─── GET /bookings/:id ────────────────────────────────
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['service'],
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');

    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (!isAdmin && booking.clientId !== userId && booking.staffId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return booking;
  }

  // ─── PATCH /bookings/:id/cancel ───────────────────────
  async cancelBooking(
    id: string,
    userId: string,
    userRole: UserRole,
    dto: CancelBookingDto,
  ): Promise<{ booking: Booking; refundAmount: number; refundEligible: boolean }> {
    const booking = await this.findOne(id, userId, userRole);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Impossible d'annuler une réservation avec le statut "${booking.status}"`,
      );
    }

    const hoursUntilBooking =
      (new Date(booking.bookedAt).getTime() - Date.now()) / (1000 * 60 * 60);

    const refundEligible = hoursUntilBooking > 24;
    const refundAmount   = refundEligible ? Number(booking.depositPaid) : 0;

    booking.status = BookingStatus.CANCELLED;
    const saved = await this.bookingRepository.save(booking);

    this.auditService.log({
      userId,
      action:     'CANCEL_BOOKING',
      entityType: 'Booking',
      entityId:   id,
      metadata:   { refundEligible, refundAmount, reason: dto.reason },
    });

    return { booking: saved, refundAmount, refundEligible };
  }

  // ─── PATCH /bookings/:id/status (coiffeur + admin) ───
  async updateStatus(
    id: string,
    userId: string,
    userRole: UserRole,
    newStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['service'],
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    // Vérifier que le coiffeur est bien assigné à ce RDV
    const isAdmin    = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isCoiffeur = userRole === UserRole.COIFFEUR;

    if (isCoiffeur && booking.staffId !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette réservation');
    }
    if (!isAdmin && !isCoiffeur) {
      throw new ForbiddenException('Accès refusé');
    }

    // Vérifier la transition
    const transitions = isAdmin
      ? ADMIN_STATUS_TRANSITIONS
      : COIFFEUR_STATUS_TRANSITIONS;

    const allowed = transitions[booking.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transition "${booking.status}" → "${newStatus}" non autorisée`,
      );
    }

    booking.status = newStatus;
    const saved = await this.bookingRepository.save(booking);

    this.auditService.log({
      userId,
      action:     'UPDATE_BOOKING_STATUS',
      entityType: 'Booking',
      entityId:   id,
      metadata:   { from: booking.status, to: newStatus },
    });

    return saved;
  }

  // ─── PATCH /bookings/:id/notes (coiffeur + admin) ────
  async updateNotes(
    id: string,
    userId: string,
    userRole: UserRole,
    staffNotes: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['service'],
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    const isAdmin    = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isCoiffeur = userRole === UserRole.COIFFEUR;

    if (isCoiffeur && booking.staffId !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette réservation');
    }
    if (!isAdmin && !isCoiffeur) {
      throw new ForbiddenException('Accès refusé — réservé au coiffeur et à l\'admin');
    }

    await this.bookingRepository.update(id, { staffNotes });

    return this.bookingRepository.findOneOrFail({
      where: { id },
      relations: ['service'],
    });
  }

  // ─── Helper : numéro de réservation ──────────────────
  private async generateBookingNumber(): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.bookingRepository.count();
    const seq   = String(count + 1).padStart(5, '0');
    return `RDV-${year}-${seq}`;
  }
}
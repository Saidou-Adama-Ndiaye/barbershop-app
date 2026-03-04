// apps\api\src\modules\coiffeur\coiffeur.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { StaffAvailability } from '../bookings/entities/staff-availability.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

// ─── Types retour ─────────────────────────────────────────
export interface DashboardStats {
  today: {
    count:    number;
    next:     Booking | null;
    bookings: Booking[];
  };
  week: {
    count:    number;
    revenue:  number;
    bookings: Booking[];
  };
  month: {
    revenue: number;
    count:   number;
  };
  uniqueClients: number;
}

export interface ClientSummary {
  clientId:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  totalRdv:    number;
  lastRdv:     Date;
  isRecurrent: boolean; // > 3 RDV
}

export interface MonthlyStats {
  month:       string; // "2025-01"
  revenue:     number;
  count:       number;
}

export interface CoiffeurStats {
  monthly:     MonthlyStats[];
  byStatus:    Record<string, number>;
  noShowRate:  number;
  topClients:  ClientSummary[];
}

@Injectable()
export class CoiffeurService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(StaffAvailability)
    private readonly availabilityRepo: Repository<StaffAvailability>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  // ─── GET /coiffeur/dashboard ──────────────────────────
  async getDashboard(staffId: string): Promise<DashboardStats> {
    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // RDV du jour
    const todayBookings = await this.bookingRepo.find({
      where: {
        staffId,
        bookedAt: Between(todayStart, todayEnd),
      },
      relations: ['service'],
      order: { bookedAt: 'ASC' },
    });

    // Prochain RDV (à venir aujourd'hui)
    const nextBooking = todayBookings.find(
      (b) =>
        new Date(b.bookedAt) > now &&
        ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status),
    ) ?? null;

    // RDV de la semaine
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekBookings = await this.bookingRepo.find({
      where: { staffId, bookedAt: Between(weekStart, weekEnd) },
      relations: ['service'],
      order: { bookedAt: 'ASC' },
    });

    const weekRevenue = weekBookings
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    // CA du mois
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthBookings = await this.bookingRepo.find({
      where: { staffId, bookedAt: Between(monthStart, monthEnd) },
    });

    const monthRevenue = monthBookings
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    // Clients uniques ce mois
    const uniqueClientIds = new Set(monthBookings.map((b) => b.clientId));

    return {
      today: {
        count:    todayBookings.filter(b => ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status)).length,
        next:     nextBooking,
        bookings: todayBookings,
      },
      week: {
        count:    weekBookings.filter(b => ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status)).length,
        revenue:  weekRevenue,
        bookings: weekBookings,
      },
      month: {
        revenue: monthRevenue,
        count:   monthBookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      },
      uniqueClients: uniqueClientIds.size,
    };
  }

  // ─── GET /coiffeur/clients ────────────────────────────
  async getClients(staffId: string): Promise<ClientSummary[]> {
    // Récupérer tous les bookings du coiffeur (non annulés)
    const bookings = await this.bookingRepo.find({
      where: { staffId },
      order: { bookedAt: 'DESC' },
    });

    // Grouper par client
    const clientMap = new Map<string, { count: number; lastRdv: Date }>();
    for (const booking of bookings) {
      if ([BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(booking.status)) continue;
      const existing = clientMap.get(booking.clientId);
      if (!existing) {
        clientMap.set(booking.clientId, { count: 1, lastRdv: new Date(booking.bookedAt) });
      } else {
        existing.count++;
        if (new Date(booking.bookedAt) > existing.lastRdv) {
          existing.lastRdv = new Date(booking.bookedAt);
        }
      }
    }

    if (clientMap.size === 0) return [];

    // Charger les infos des clients
    const clientIds = Array.from(clientMap.keys());
    const users = await this.userRepo.find({
      where: clientIds.map((id) => ({ id })),
      select: ['id', 'firstName', 'lastName', 'email'],
    });

    return users.map((user): ClientSummary => {
      const stats = clientMap.get(user.id)!;
      return {
        clientId:    user.id,
        firstName:   user.firstName,
        lastName:    user.lastName,
        email:       user.email,
        totalRdv:    stats.count,
        lastRdv:     stats.lastRdv,
        isRecurrent: stats.count > 3,
      };
    }).sort((a, b) => b.totalRdv - a.totalRdv);
  }

  // ─── GET /coiffeur/clients/:clientId/history ──────────
  async getClientHistory(
    staffId: string,
    clientId: string,
  ): Promise<{ client: Partial<User>; bookings: Booking[] }> {
    const client = await this.userRepo.findOne({
      where: { id: clientId },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'createdAt'],
    });
    if (!client) throw new NotFoundException('Client introuvable');

    const bookings = await this.bookingRepo.find({
      where: { staffId, clientId },
      relations: ['service'],
      order: { bookedAt: 'DESC' },
    });

    return { client, bookings };
  }

  // ─── GET /coiffeur/stats ──────────────────────────────
  async getStats(staffId: string): Promise<CoiffeurStats> {
    // CA sur 6 derniers mois
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allBookings = await this.bookingRepo.find({
      where: { staffId, bookedAt: MoreThanOrEqual(sixMonthsAgo) },
    });

    // CA mensuel
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (const booking of allBookings) {
      const d     = new Date(booking.bookedAt);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) ?? { revenue: 0, count: 0 };
      if (booking.status === BookingStatus.COMPLETED) {
        entry.revenue += Number(booking.totalPrice);
        entry.count++;
      }
      monthlyMap.set(key, entry);
    }

    const monthly: MonthlyStats[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Répartition par statut
    const byStatus: Record<string, number> = {};
    for (const booking of allBookings) {
      byStatus[booking.status] = (byStatus[booking.status] ?? 0) + 1;
    }

    // Taux no-show
    const total  = allBookings.filter(b =>
      b.status !== BookingStatus.CANCELLED,
    ).length;
    const noShow = allBookings.filter(b =>
      b.status === BookingStatus.NO_SHOW,
    ).length;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

    // Top clients
    const topClients = (await this.getClients(staffId)).slice(0, 5);

    return { monthly, byStatus, noShowRate, topClients };
  }

  // ─── GET /staff/availability ──────────────────────────
  async getAvailability(staffId: string): Promise<StaffAvailability[]> {
    return this.availabilityRepo.find({
      where: { staffId },
      order: { dayOfWeek: 'ASC' },
    });
  }

  // ─── POST /staff/availability ─────────────────────────
  async createAvailability(
    staffId: string,
    data: {
      dayOfWeek: number;
      startTime: string;
      endTime:   string;
      isActive?: boolean;
    },
  ): Promise<StaffAvailability> {
    // Vérifier qu'il n'y a pas déjà une plage pour ce jour
    const existing = await this.availabilityRepo.findOne({
      where: { staffId, dayOfWeek: data.dayOfWeek },
    });

    if (existing) {
      // Mettre à jour plutôt que créer un doublon
      await this.availabilityRepo.update(existing.id, {
        startTime: data.startTime,
        endTime:   data.endTime,
        isActive:  data.isActive ?? true,
      });
      return this.availabilityRepo.findOneOrFail({ where: { id: existing.id } });
    }

    const availability = this.availabilityRepo.create({
      staffId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime:   data.endTime,
      isActive:  data.isActive ?? true,
    });

    return this.availabilityRepo.save(availability);
  }

  // ─── PATCH /staff/availability/:id ───────────────────
  async updateAvailability(
    staffId: string,
    availabilityId: string,
    data: {
      startTime?: string;
      endTime?:   string;
      isActive?:  boolean;
    },
  ): Promise<StaffAvailability> {
    const availability = await this.availabilityRepo.findOne({
      where: { id: availabilityId, staffId },
    });
    if (!availability) throw new NotFoundException('Plage horaire introuvable');

    await this.availabilityRepo.update(availabilityId, {
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime   !== undefined && { endTime:   data.endTime   }),
      ...(data.isActive  !== undefined && { isActive:  data.isActive  }),
    });

    return this.availabilityRepo.findOneOrFail({ where: { id: availabilityId } });
  }

  // ─── DELETE /staff/availability/:id ──────────────────
  async deleteAvailability(staffId: string, availabilityId: string): Promise<void> {
    const availability = await this.availabilityRepo.findOne({
      where: { id: availabilityId, staffId },
    });
    if (!availability) throw new NotFoundException('Plage horaire introuvable');

    await this.availabilityRepo.delete(availabilityId);
  }

  // ─── GET /coiffeur/rdv — liste filtrée ───────────────
  async getBookings(
    staffId: string,
    filter: 'today' | 'week' | 'month' | 'all',
  ): Promise<Booking[]> {
    const now = new Date();
    let start: Date | undefined;
    let end:   Date | undefined;

    if (filter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (filter === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (filter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.client', 'client')
      .where('booking.staffId = :staffId', { staffId })
      .orderBy('booking.bookedAt', 'ASC');

    if (start && end) {
      qb.andWhere('booking.bookedAt BETWEEN :start AND :end', { start, end });
    }

    return qb.getMany();
  }
}
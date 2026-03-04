// apps\api\src\modules\notifications\cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Cron : rappels RDV chaque matin à 8h (client) ───
  @Cron('0 8 * * *', { name: 'booking-reminders', timeZone: 'Africa/Dakar' })
  async sendDailyReminders(): Promise<void> {
    this.logger.log('⏰ Cron rappels RDV démarré...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const bookings = await this.bookingRepo.find({
      where: {
        bookedAt: Between(tomorrow, tomorrowEnd),
        status:   BookingStatus.DEPOSIT_PAID,
      },
      relations: ['service'],
    });

    this.logger.log(`📅 ${bookings.length} RDV demain à rappeler`);

    for (const booking of bookings) {
      await this.notificationsService
        .sendBookingReminder(booking)
        .catch((err) =>
          this.logger.error(`Erreur rappel ${booking.bookingNumber}: ${(err as Error).message}`),
        );
    }

    this.logger.log(`✅ Cron rappels terminé: ${bookings.length} emails envoyés`);
  }

  // ─── Cron : rappel 1h avant → coiffeur (toutes les 15min) ─
  @Cron('*/15 * * * *', { name: 'staff-hour-reminders', timeZone: 'Africa/Dakar' })
  async sendHourRemindersToStaff(): Promise<void> {
    this.logger.log('⏰ Cron rappels 1h coiffeur démarré...');

    // Fenêtre : RDV entre 55min et 65min à partir de maintenant
    const now     = new Date();
    const from    = new Date(now.getTime() + 55 * 60 * 1000);
    const to      = new Date(now.getTime() + 65 * 60 * 1000);

    const bookings = await this.bookingRepo.find({
      where: {
        bookedAt: Between(from, to),
        status:   BookingStatus.CONFIRMED,
      },
      relations: ['service', 'staff', 'client'],
    });

    this.logger.log(`🔔 ${bookings.length} RDV dans ~1h à rappeler au coiffeur`);

    for (const booking of bookings) {
      // Vérifier que le staff a un email
      const staff  = booking.staff  as User | undefined;
      const client = booking.client as User | undefined;

      if (!staff?.email) {
        this.logger.warn(`Staff sans email pour RDV ${booking.bookingNumber}`);
        continue;
      }

      const clientName = client
        ? `${client.firstName} ${client.lastName}`
        : `Client #${booking.clientId.substring(0, 8)}`;

      await this.notificationsService
        .sendHourReminderToStaff(
          booking,
          staff.email,
          staff.firstName,
          clientName,
        )
        .catch((err) =>
          this.logger.error(
            `Erreur rappel 1h ${booking.bookingNumber}: ${(err as Error).message}`,
          ),
        );
    }

    this.logger.log(`✅ Cron rappels 1h coiffeur terminé`);
  }

  // ─── Méthodes de test manuel ──────────────────────────
  async triggerRemindersNow(): Promise<{ count: number }> {
    this.logger.log('🔧 Déclenchement manuel des rappels clients...');
    await this.sendDailyReminders();
    return { count: 1 };
  }

  async triggerHourRemindersNow(): Promise<{ count: number }> {
    this.logger.log('🔧 Déclenchement manuel rappels 1h coiffeur...');
    await this.sendHourRemindersToStaff();
    return { count: 1 };
  }
}
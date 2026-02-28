import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Cron : rappels RDV chaque matin à 8h ────────────
  @Cron('0 8 * * *', { name: 'booking-reminders', timeZone: 'Africa/Dakar' })
  async sendDailyReminders(): Promise<void> {
    this.logger.log('⏰ Cron rappels RDV démarré...');

    // Fenêtre = demain 00:00 → 23:59
    const tomorrow      = new Date();
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
          this.logger.error(`Erreur rappel ${booking.bookingNumber}: ${err.message}`),
        );
    }

    this.logger.log(`✅ Cron rappels terminé: ${bookings.length} emails envoyés`);
  }

  // ─── Méthode de test manuel (déclencher à la demande) ─
  async triggerRemindersNow(): Promise<{ count: number }> {
    this.logger.log('🔧 Déclenchement manuel des rappels...');
    await this.sendDailyReminders();
    return { count: 1 };
  }
}
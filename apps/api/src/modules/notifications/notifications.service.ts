import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
      ignoreTLS: true,
    });
  }

  // ─── Email confirmation réservation ──────────────────
  async sendBookingConfirmation(
    booking: Booking,
    depositAmount: number,
  ): Promise<void> {
    const serviceName = booking.service?.name ?? 'Service';
    const bookedDate  = new Date(booking.bookedAt).toLocaleString('fr-SN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb">

    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-size:28px;margin:0">✂️ BarberShop</h1>
      <p style="color:#6b7280;margin-top:4px">Confirmation de réservation</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="color:#166534;font-weight:bold;margin:0">
        ✅ Votre réservation est confirmée !
      </p>
    </div>

    <h2 style="font-size:18px;color:#111827">Détails de votre rendez-vous</h2>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 0;color:#6b7280;width:40%">Numéro RDV</td>
        <td style="padding:10px 0;font-weight:bold">${booking.bookingNumber}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 0;color:#6b7280">Formule</td>
        <td style="padding:10px 0;font-weight:bold">${serviceName}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 0;color:#6b7280">Date & heure</td>
        <td style="padding:10px 0;font-weight:bold">${bookedDate}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 0;color:#6b7280">Prix total</td>
        <td style="padding:10px 0;font-weight:bold">
          ${new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(Number(booking.totalPrice))}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#6b7280">Acompte payé</td>
        <td style="padding:10px 0;font-weight:bold;color:#16a34a">
          ${new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(depositAmount)} ✅
        </td>
      </tr>
    </table>

    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="color:#92400e;margin:0;font-size:14px">
        ⚠️ <strong>Politique d'annulation :</strong>
        Annulation gratuite jusqu'à 24h avant le rendez-vous.
        Passé ce délai, l'acompte ne sera pas remboursé.
      </p>
    </div>

    <p style="color:#6b7280;font-size:14px;text-align:center;margin:0">
      BarberShop — Produits & Accessoires professionnels<br>
      Sénégal & Zone UEMOA
    </p>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.configService.get<string>('EMAIL_FROM', 'noreply@barbershop.local'),
        to:      `client-${booking.clientId}@barbershop.local`,
        subject: `✅ Réservation confirmée — ${booking.bookingNumber}`,
        html,
      });
      this.logger.log(`📧 Email confirmation envoyé: ${booking.bookingNumber}`);
    } catch (err) {
      this.logger.error(`Erreur envoi email: ${(err as Error).message}`);
    }
  }

  // ─── Email rappel 24h avant ───────────────────────────
  async sendBookingReminder(booking: Booking): Promise<void> {
    const serviceName = booking.service?.name ?? 'Service';
    const bookedDate  = new Date(booking.bookedAt).toLocaleString('fr-SN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-size:28px;margin:0">✂️ BarberShop</h1>
      <p style="color:#6b7280;margin-top:4px">Rappel de rendez-vous</p>
    </div>
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="color:#1e40af;font-weight:bold;margin:0">
        ⏰ Votre rendez-vous est demain !
      </p>
    </div>
    <p style="color:#374151">
      Rappel pour votre réservation <strong>${booking.bookingNumber}</strong><br>
      Formule <strong>${serviceName}</strong> — ${bookedDate}
    </p>
    <p style="color:#6b7280;font-size:14px;text-align:center;margin-top:32px">
      BarberShop — Sénégal & Zone UEMOA
    </p>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from:    this.configService.get<string>('EMAIL_FROM', 'noreply@barbershop.local'),
        to:      `client-${booking.clientId}@barbershop.local`,
        subject: `⏰ Rappel — Votre RDV demain : ${booking.bookingNumber}`,
        html,
      });
      this.logger.log(`📧 Email rappel envoyé: ${booking.bookingNumber}`);
    } catch (err) {
      this.logger.error(`Erreur envoi rappel: ${(err as Error).message}`);
    }
  }
}
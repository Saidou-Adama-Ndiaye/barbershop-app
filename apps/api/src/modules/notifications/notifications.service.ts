import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationLog } from './entities/notification-log.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class NotificationsService {
  private readonly logger      = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private readonly templatesDir: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
  ) {
    this.transporter = nodemailer.createTransport({
      host:      this.configService.get<string>('SMTP_HOST', 'localhost'),
      port:      this.configService.get<number>('SMTP_PORT', 1025),
      secure:    false,
      ignoreTLS: true,
    });

    // Chercher les templates dans src/ (dev) ou dist/ (prod)
    const srcPath  = path.join(process.cwd(), 'src',  'modules', 'notifications', 'templates');
    const distPath = path.join(process.cwd(), 'dist', 'modules', 'notifications', 'templates');

    if (fs.existsSync(srcPath)) {
      this.templatesDir = srcPath;
    } else if (fs.existsSync(distPath)) {
      this.templatesDir = distPath;
    } else {
      this.templatesDir = srcPath; // fallback
    }

    this.logger.log(`📁 Templates dir: ${this.templatesDir}`);
  }

  // ─── Compiler un template Handlebars ─────────────────
  private compileTemplate(templateName: string, data: Record<string, unknown>): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      this.logger.warn(`Template non trouvé: ${templatePath}`);
      return `<p>Email: ${JSON.stringify(data)}</p>`;
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template        = Handlebars.compile(templateSource);
    return template(data);
  }

  // ─── Envoyer un email + log en DB ────────────────────
  public async sendEmail(options: {
    to:           string;
    subject:      string;
    template:     string;
    data:         Record<string, unknown>;
    userId?:      string;
  }): Promise<void> {
    const html = this.compileTemplate(options.template, options.data);

    let status = 'sent';
    try {
      await this.transporter.sendMail({
        from:    this.configService.get<string>('EMAIL_FROM', 'noreply@barbershop.local'),
        to:      options.to,
        subject: options.subject,
        html,
      });
      this.logger.log(`📧 Email envoyé [${options.template}] → ${options.to}`);
    } catch (err) {
      status = 'failed';
      this.logger.error(`Erreur email [${options.template}]: ${(err as Error).message}`);
    }

    // Log en DB (fire-and-forget)
    this.logRepo.save(
      this.logRepo.create({
        userId:    options.userId,
        type:      'email',
        template:  options.template,
        recipient: options.to,
        subject:   options.subject,
        status,
        metadata:  { template: options.template, ...options.data },
      }),
    ).catch((e) => this.logger.error(`Erreur log notification: ${e.message}`));
  }

  // ─── Email confirmation réservation ──────────────────
  async sendBookingConfirmation(
    booking: Booking,
    depositAmount: number,
  ): Promise<void> {
    const bookedDate = new Date(booking.bookedAt).toLocaleString('fr-SN', {
      dateStyle: 'full', timeStyle: 'short',
    });

    await this.sendEmail({
      to:       `client-${booking.clientId}@barbershop.local`,
      subject:  `✅ Réservation confirmée — ${booking.bookingNumber}`,
      template: 'booking-confirmation',
      userId:   booking.clientId,
      data: {
        firstName:     'Client',
        bookingNumber: booking.bookingNumber,
        serviceName:   booking.service?.name ?? 'Service',
        bookedAt:      bookedDate,
        durationMin:   booking.service?.durationMin ?? 0,
        totalPrice:    new Intl.NumberFormat('fr-SN').format(Number(booking.totalPrice)),
        depositAmount: new Intl.NumberFormat('fr-SN').format(depositAmount),
      },
    });
  }

  // ─── Email rappel 24h avant ───────────────────────────
  async sendBookingReminder(booking: Booking): Promise<void> {
    const bookedDate = new Date(booking.bookedAt).toLocaleString('fr-SN', {
      dateStyle: 'full', timeStyle: 'short',
    });

    // Deadline annulation = 24h avant
    const deadline = new Date(new Date(booking.bookedAt).getTime() - 24 * 60 * 60 * 1000);
    const deadlineStr = deadline.toLocaleString('fr-SN', {
      dateStyle: 'short', timeStyle: 'short',
    });

    await this.sendEmail({
      to:       `client-${booking.clientId}@barbershop.local`,
      subject:  `⏰ Rappel RDV demain — ${booking.bookingNumber}`,
      template: 'reminder-24h',
      userId:   booking.clientId,
      data: {
        firstName:            'Client',
        bookingNumber:        booking.bookingNumber,
        serviceName:          booking.service?.name ?? 'Service',
        bookedAt:             bookedDate,
        durationMin:          booking.service?.durationMin ?? 0,
        cancellationDeadline: deadlineStr,
      },
    });
  }

  // ─── Email commande expédiée ──────────────────────────
  async sendOrderShipped(order: {
    clientId:    string;
    orderNumber: string;
    totalAmount: number;
    items:       { name: string; quantity: number; price: number }[];
    trackingNumber?: string;
  }): Promise<void> {
    await this.sendEmail({
      to:       `client-${order.clientId}@barbershop.local`,
      subject:  `🚚 Commande expédiée — ${order.orderNumber}`,
      template: 'order-shipped',
      userId:   order.clientId,
      data: {
        firstName:      'Client',
        orderNumber:    order.orderNumber,
        shippedAt:      new Date().toLocaleDateString('fr-SN'),
        totalAmount:    new Intl.NumberFormat('fr-SN').format(order.totalAmount),
        items:          order.items.map((i) => ({
          ...i,
          price: new Intl.NumberFormat('fr-SN').format(i.price),
        })),
        trackingNumber: order.trackingNumber,
      },
    });
  }

  // ─── Historique notifications (admin) ─────────────────
  async findAll(filters: {
    type?:     string;
    template?: string;
    userId?:   string;
  }): Promise<NotificationLog[]> {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .orderBy('log.sentAt', 'DESC')
      .take(100);

    if (filters.type)     qb.andWhere('log.type = :type',         { type:     filters.type });
    if (filters.template) qb.andWhere('log.template = :template', { template: filters.template });
    if (filters.userId)   qb.andWhere('log.userId = :userId',     { userId:   filters.userId });

    return qb.getMany();
  }
}
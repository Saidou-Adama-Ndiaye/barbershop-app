// .\.\apps\api\src\modules\payments\payments.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { WebhookWaveDto } from './dto/webhook-wave.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Initier un paiement ─────────────────────────────
  async initiatePayment(dto: InitiatePaymentDto): Promise<{
    paymentId: string;
    redirectUrl: string;
    expiresAt: string;
    amount: number;
  }> {
    const payment = this.paymentRepository.create({
      entityType: dto.entityType,
      entityId:   dto.entityId,
      amount:     dto.amount,
      currency:   dto.currency ?? 'XOF',
      provider:   dto.provider ?? 'wave',
      status:     PaymentStatus.PENDING,
    });
    const saved = await this.paymentRepository.save(payment);

    try {
      const waveUrl = this.configService.get<string>(
        'WAVE_API_URL',
        'http://localhost:3002',
      );

      const response = await fetch(`${waveUrl}/initiate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:     dto.amount,
          currency:   dto.currency ?? 'XOF',
          phone:      dto.phone ?? '+221000000000',
          entityType: dto.entityType,
          entityId:   dto.entityId,
        }),
      });

      const data = await response.json() as {
        paymentId: string;
        redirectUrl: string;
        expiresAt: string;
        transactionId: string;
      };

      await this.paymentRepository.update(saved.id, {
        providerTransactionId: data.transactionId,
        metadata: { wavePaymentId: data.paymentId },
      });

      this.logger.log(
        `💳 Paiement initié: ${saved.id} — ${dto.amount} XOF pour ${dto.entityType}/${dto.entityId}`,
      );

      return {
        paymentId:   saved.id,
        redirectUrl: data.redirectUrl,
        expiresAt:   data.expiresAt,
        amount:      dto.amount,
      };
    } catch (err) {
      this.logger.warn(`Wave mock non disponible: ${(err as Error).message}`);
      return {
        paymentId:   saved.id,
        redirectUrl: `http://localhost:3002/pay-simulation?paymentId=${saved.id}`,
        expiresAt:   new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        amount:      dto.amount,
      };
    }
  }

  // ─── Traiter webhook Wave ─────────────────────────────
  async processWebhook(
    dto: WebhookWaveDto,
    signature: string,
  ): Promise<{ success: boolean; message: string }> {
    // 1. Vérifier la signature HMAC
    this.verifyWaveSignature(dto, signature);

    // 2. Trouver le paiement par paymentId Wave (dans metadata)
    const payment = await this.paymentRepository
      .createQueryBuilder('payment')
      .where(`payment.metadata->>'wavePaymentId' = :paymentId`, {
        paymentId: dto.paymentId,
      })
      .getOne();

    // Fallback : chercher par entity directement
    const targetPayment = payment ?? await this.paymentRepository.findOne({
      where: { entityId: dto.paymentId },
    });

    if (!targetPayment) {
      this.logger.warn(`Webhook reçu pour paiement inconnu: ${dto.paymentId}`);
      // On retourne 200 pour éviter les retries inutiles
      return { success: true, message: 'Paiement non trouvé, ignoré' };
    }

    if (dto.status === 'completed') {
      // 3. Mettre à jour le paiement
      await this.paymentRepository.update(targetPayment.id, {
        status:                PaymentStatus.COMPLETED,
        providerTransactionId: dto.transactionId,
      });

      // 4. Mettre à jour l'entité associée
      if (targetPayment.entityType === 'booking') {
        await this.handleBookingPaymentConfirmed(
          targetPayment.entityId,
          Number(targetPayment.amount),
        );
      }

      // 5. Audit log
      this.auditService.log({
        action:     'PAYMENT_RECEIVED',
        entityType: 'Payment',
        entityId:   targetPayment.id,
        metadata:   {
          provider:      'wave',
          amount:        dto.amount,
          transactionId: dto.transactionId,
        },
      });

      this.logger.log(
        `✅ Paiement confirmé: ${targetPayment.id} — ${dto.amount} XOF`,
      );
    }

    return { success: true, message: 'Webhook traité avec succès' };
  }

  // ─── Confirmer paiement booking ───────────────────────
  private async handleBookingPaymentConfirmed(
    bookingId: string,
    depositAmount: number,
  ): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['service'],
    });

    if (!booking) {
      this.logger.warn(`Booking introuvable pour paiement: ${bookingId}`);
      return;
    }

    await this.bookingRepository.update(bookingId, {
      status:      BookingStatus.DEPOSIT_PAID,
      depositPaid: depositAmount,
    });

    // Envoyer email de confirmation (fire-and-forget)
    this.notificationsService
      .sendBookingConfirmation(booking, depositAmount)
      .catch((err) =>
        this.logger.error(`Erreur email confirmation: ${(err as Error).message}`),
      );
  }

  // ─── Remboursement ────────────────────────────────────
  async refundPayment(entityId: string, amount: number): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { entityId, status: PaymentStatus.COMPLETED },
    });

    if (!payment) return;

    await this.paymentRepository.update(payment.id, {
      status:   PaymentStatus.REFUNDED,
      metadata: {
        ...(payment.metadata as object),
        refundAmount: amount,
        refundedAt:   new Date().toISOString(),
      },
    });

    this.logger.log(`💸 Remboursement: ${amount} XOF pour entity ${entityId}`);
  }

  // ─── Helpers ──────────────────────────────────────────
  async findByEntityId(entityId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { entityId } });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<void> {
    await this.paymentRepository.update(id, { status });
  }

  // ─── Vérification signature HMAC-SHA256 ───────────────
  verifyWaveSignature(payload: unknown, signature: string): void {
    const secret = this.configService.get<string>(
      'WAVE_WEBHOOK_SECRET',
      'mock_webhook_secret',
    );

    const expectedSig = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')}`;

    if (signature !== expectedSig) {
      throw new UnauthorizedException('Signature Wave invalide');
    }
  }
}
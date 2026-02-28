import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async initiatePayment(dto: InitiatePaymentDto): Promise<{
    paymentId: string;
    redirectUrl: string;
    expiresAt: string;
    amount: number;
  }> {
    // Créer le paiement en DB
    const payment = this.paymentRepository.create({
      entityType: dto.entityType,
      entityId:   dto.entityId,
      amount:     dto.amount,
      currency:   dto.currency ?? 'XOF',
      provider:   dto.provider ?? 'wave',
      status:     PaymentStatus.PENDING,
    });
    const saved = await this.paymentRepository.save(payment);

    // Appeler le mock Wave
    try {
      const response = await fetch('http://localhost:3002/initiate', {
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

      // Mettre à jour avec l'ID transaction Wave
      await this.paymentRepository.update(saved.id, {
        providerTransactionId: data.transactionId,
        metadata: { wavePaymentId: data.paymentId },
      });

      return {
        paymentId:   saved.id,
        redirectUrl: data.redirectUrl,
        expiresAt:   data.expiresAt,
        amount:      dto.amount,
      };
    } catch {
      // Mock Wave non disponible → retourner quand même
      return {
        paymentId:   saved.id,
        redirectUrl: `http://localhost:3002/pay-simulation?paymentId=${saved.id}`,
        expiresAt:   new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        amount:      dto.amount,
      };
    }
  }

  async findByEntityId(entityId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { entityId } });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<void> {
    await this.paymentRepository.update(id, { status });
  }
}
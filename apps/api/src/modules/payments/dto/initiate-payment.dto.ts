export class InitiatePaymentDto {
  amount: number;
  currency: string;
  provider: string;
  entityType: string;
  entityId: string;
  phone?: string;
}
// .\.\apps\api\src\modules\payments\dto\initiate-payment.dto.ts
export class InitiatePaymentDto {
  amount: number;
  currency: string;
  provider: string;
  entityType: string;
  entityId: string;
  phone?: string;
}
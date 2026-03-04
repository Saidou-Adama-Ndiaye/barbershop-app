// apps/web/lib/coupons.ts
import api from './api';

// ─── Types ───────────────────────────────────────────────
export interface CouponValidation {
  valid: boolean;
  code: string;
  discountType: 'percent' | 'fixed' | '';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  message?: string;
}

// ─── Valider un code promo ────────────────────────────────
export const validateCoupon = async (
  code: string,
  orderAmount: number,
): Promise<CouponValidation> => {
  const { data } = await api.post<CouponValidation>('/coupons/validate', {
    code,
    orderAmount,
  });
  return data;
};
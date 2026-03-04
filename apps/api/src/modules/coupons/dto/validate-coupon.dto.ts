// apps/api/src/modules/coupons/dto/validate-coupon.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateCouponDto {
  @ApiProperty({ example: 'PROMO10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 15000, description: 'Montant total de la commande en XOF' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;
}

export class ValidateCouponResponseDto {
  valid: boolean;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;   // montant déduit calculé
  finalAmount: number;      // montant après réduction
  message?: string;
}
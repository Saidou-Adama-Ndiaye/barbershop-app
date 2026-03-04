// .\.\apps\api\src\modules\orders\dto\create-order.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-pack' })
  @IsUUID('all')
  packId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({
    example: { additions: [], removals: ['uuid-produit'] },
  })
  @IsOptional()
  @IsObject()
  customizations?: Record<string, unknown>;
}

export class DeliveryAddressDto {
  @ApiProperty({ example: 'Moussa Diallo' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'Dakar, Plateau' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Dakar' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: '+221771234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ type: DeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({ example: 'Livrer après 18h' })
  @IsOptional()
  @IsString()
  notes?: string;

  // ─── NOUVEAU Sprint 7 ────────────────────────────────
  @ApiPropertyOptional({ example: 'PROMO10', description: 'Code promo optionnel' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
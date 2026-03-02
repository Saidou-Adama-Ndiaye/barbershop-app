// .\.\apps\api\src\modules\packs\dto\create-pack.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PackProductItemDto {
  @ApiProperty({ example: 'uuid-produit' })
  @IsUUID('all')
  productId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class CreatePackDto {
  @ApiProperty({ example: 'Pack Rasage Pro' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'pack-rasage-pro' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne doit contenir que des lettres minuscules, chiffres et tirets',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Pack complet pour rasage professionnel' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPct?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCustomizable?: boolean;

  @ApiPropertyOptional({ example: 'uuid-categorie' })
  @IsOptional()
  @IsUUID('all')
  categoryId?: string;

  @ApiPropertyOptional({ type: [PackProductItemDto] })
  @IsOptional()
  @IsArray()
  @Type(() => PackProductItemDto)
  products?: PackProductItemDto[];
}
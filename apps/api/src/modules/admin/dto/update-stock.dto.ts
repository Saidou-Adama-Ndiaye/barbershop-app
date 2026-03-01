// .\.\apps\api\src\modules\admin\dto\update-stock.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockDto {
  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'Réapprovisionnement fournisseur' })
  @IsOptional()
  @IsString()
  reason?: string;
}
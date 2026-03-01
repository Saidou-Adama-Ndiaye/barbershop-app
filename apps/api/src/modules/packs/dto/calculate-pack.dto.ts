// .\.\apps\api\src\modules\packs\dto\calculate-pack.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class CalculatePackDto {
  @ApiPropertyOptional({
    description: 'IDs des produits à ajouter au pack',
    example: ['uuid-produit-1'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  additions?: string[];

  @ApiPropertyOptional({
    description: 'IDs des produits optionnels à retirer du pack',
    example: ['uuid-produit-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  removals?: string[];
}
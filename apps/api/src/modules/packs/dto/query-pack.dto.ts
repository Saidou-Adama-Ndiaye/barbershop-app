// .\.\apps\api\src\modules\packs\dto\query-pack.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPackDto {
  @ApiPropertyOptional({ example: 'barbe' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'coupe' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'price', enum: ['price', 'rating', 'createdAt'] })
  @IsOptional()
  @IsString()
  @IsIn(['price', 'rating', 'createdAt'])
  sortBy?: 'price' | 'rating' | 'createdAt';

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}
// .\.\apps\api\src\modules\formations\dto\query-formation.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, Max, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FormationLevel } from '../entities/formation.entity';

export class QueryFormationDto {
  @ApiPropertyOptional({ enum: FormationLevel })
  @IsOptional()
  @IsEnum(FormationLevel)
  level?: FormationLevel;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'fr' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
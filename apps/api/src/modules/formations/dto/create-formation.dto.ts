// .\.\apps\api\src\modules\formations\dto\create-formation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsBoolean, IsArray, Min, Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormationLevel } from '../entities/formation.entity';

export class CreateFormationDto {
  @ApiProperty({ example: 'Maîtriser la Coupe Homme' })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiProperty({ example: 'coupe-homme-debutant' })
  @IsString()
  @Length(3, 255)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: FormationLevel })
  @IsOptional()
  @IsEnum(FormationLevel)
  level?: FormationLevel;

  @ApiPropertyOptional({ example: 'fr' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: ['coupe', 'debutant'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
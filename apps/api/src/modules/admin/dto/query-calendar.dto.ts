// .\.\apps\api\src\modules\admin\dto\query-calendar.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryCalendarDto {
  @ApiPropertyOptional({ example: 'uuid-staff' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ example: '2025-09-01' })
  @IsOptional()
  @IsString()
  weekStart?: string;
}
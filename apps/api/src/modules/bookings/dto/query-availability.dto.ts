// .\.\apps\api\src\modules\bookings\dto\query-availability.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString } from 'class-validator';

export class QueryAvailabilityDto {
  @ApiProperty({ example: 'uuid-staff' })
  @IsUUID()
  staffId: string;

  @ApiProperty({ example: '2025-08-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'uuid-service' })
  @IsUUID()
  serviceId: string;
}
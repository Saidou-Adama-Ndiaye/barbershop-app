// .\.\apps\api\src\modules\bookings\dto\create-booking.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-service' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 'uuid-staff' })
  @IsUUID()
  staffId: string;

  @ApiProperty({ example: '2025-08-15T09:00:00.000Z' })
  @IsDateString()
  bookedAt: string;

  @ApiPropertyOptional({ example: 'Préférence coupe dégradé' })
  @IsOptional()
  @IsString()
  notes?: string;
}
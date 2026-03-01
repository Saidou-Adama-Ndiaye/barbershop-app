// .\.\apps\api\src\modules\bookings\dto\cancel-booking.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Empêchement de dernière minute' })
  @IsOptional()
  @IsString()
  reason?: string;
}
// .\.\apps\api\src\modules\payments\dto\webhook-wave.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID } from 'class-validator';

export class WebhookWaveDto {
  @ApiProperty()
  @IsUUID('all')
  paymentId: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
}
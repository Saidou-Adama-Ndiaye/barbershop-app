import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID } from 'class-validator';

export class WebhookWaveDto {
  @ApiProperty()
  @IsUUID()
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
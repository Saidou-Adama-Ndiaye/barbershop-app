import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { WebhookWaveDto } from './dto/webhook-wave.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── POST /payments/webhook/wave ──────────────────────
  @Public()
  @Post('webhook/wave')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Wave — confirmation paiement' })
  @ApiResponse({ status: 200, description: 'Webhook traité' })
  @ApiResponse({ status: 401, description: 'Signature invalide' })
  async handleWaveWebhook(
    @Body() dto: WebhookWaveDto,
    @Headers('wave-signature') signature: string,
  ) {
    this.logger.log(`📩 Webhook Wave reçu: ${JSON.stringify(dto)}`);
    return this.paymentsService.processWebhook(dto, signature ?? '');
  }
}
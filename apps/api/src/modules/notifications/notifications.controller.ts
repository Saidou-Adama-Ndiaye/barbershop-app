import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CronService } from './cron.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly cronService: CronService,
  ) {}

  // ─── GET /notifications ───────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Historique notifications (admin)' })
  findAll(
    @Query('type')     type?: string,
    @Query('template') template?: string,
    @Query('userId')   userId?: string,
  ) {
    return this.notificationsService.findAll({ type, template, userId });
  }

  // ─── POST /notifications/trigger-reminders ───────────
  @Post('trigger-reminders')
  @ApiOperation({ summary: 'Déclencher manuellement les rappels RDV (test)' })
  triggerReminders() {
    return this.cronService.triggerRemindersNow();
  }

  // ─── POST /notifications/test-email ──────────────────
  @Post('test-email')
    @ApiOperation({ summary: 'Envoyer un email de test (admin)' })
    async testEmail(@CurrentUser() user: { id: string }) {
    await this.notificationsService.sendEmail({
        to:       'test@barbershop.local',
        subject:  '🧪 Test Email BarberShop',
        template: 'booking-confirmation',
        userId:   user.id,
        data: {
        firstName:     'Test',
        bookingNumber: 'RDV-TEST-001',
        serviceName:   'Formule VIP',
        bookedAt:      new Date().toLocaleString('fr-SN'),
        durationMin:   45,
        totalPrice:    '10 000',
        depositAmount: '3 000',
        },
    });
    return { success: true, message: 'Email envoyé → vérifier MailHog http://localhost:8025' };
   }
}
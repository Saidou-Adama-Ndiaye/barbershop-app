// .\.\apps\api\src\modules\notifications\notifications.controller.ts
import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CronService }          from './cron.service';
import { JwtAuthGuard }         from '../auth/guards/jwt-auth.guard';
import { RolesGuard }           from '../auth/guards/roles.guard';
import { Roles }                from '../auth/decorators/roles.decorator';
import { CurrentUser }          from '../auth/decorators/current-user.decorator';
import { UserRole }             from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly cronService:          CronService,
  ) {}

  // ─── GET /notifications/me (tout utilisateur connecté) ──
  @Get('me')
  @ApiOperation({ summary: 'Mes notifications (client connecté)' })
  findMine(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findByUser(
      user.id,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ─── GET /notifications (admin only) ─────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Historique notifications (admin)' })
  findAll(
    @Query('type')     type?:     string,
    @Query('template') template?: string,
    @Query('userId')   userId?:   string,
  ) {
    return this.notificationsService.findAll({ type, template, userId });
  }

  // ─── POST /notifications/trigger-reminders (admin) ───────
  @Post('trigger-reminders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Déclencher manuellement les rappels RDV (test)' })
  triggerReminders() {
    return this.cronService.triggerRemindersNow();
  }

  // ─── POST /notifications/test-email (admin) ──────────────
  @Post('test-email')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
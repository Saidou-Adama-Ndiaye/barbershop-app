// apps\api\src\modules\notifications\notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService }    from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CronService }             from './cron.service';
import { NotificationLog }         from './entities/notification-log.entity';
import { Booking }                 from '../bookings/entities/booking.entity';
import { User }                    from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, Booking, User]),
  ],
  providers:   [NotificationsService, CronService],
  controllers: [NotificationsController],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
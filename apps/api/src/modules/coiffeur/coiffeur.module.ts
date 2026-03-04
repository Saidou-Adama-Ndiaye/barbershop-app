// apps\api\src\modules\coiffeur\coiffeur.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { StaffAvailability } from '../bookings/entities/staff-availability.entity';
import { User } from '../users/entities/user.entity';
import { CoiffeurService } from './coiffeur.service';
import { CoiffeurController, StaffAvailabilityController } from './coiffeur.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, StaffAvailability, User]),
    AuditModule,
    NotificationsModule,
  ],
  providers:   [CoiffeurService],
  controllers: [CoiffeurController, StaffAvailabilityController],
  exports:     [CoiffeurService],
})
export class CoiffeurModule {}
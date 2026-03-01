// .\.\apps\api\src\modules\bookings\bookings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { StaffAvailability } from './entities/staff-availability.entity';
import { Service } from '../services/entities/service.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, StaffAvailability, Service]),
    AuditModule,
    PaymentsModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
// .\.\apps\api\src\modules\admin\admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User }     from '../users/entities/user.entity';
import { Order }    from '../orders/entities/order.entity';
import { Product }  from '../packs/entities/product.entity';
import { Booking }  from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Order, Product, Booking, AuditLog]),
  ],
  providers:   [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
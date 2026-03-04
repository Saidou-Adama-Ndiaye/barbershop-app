// apps\api\src\modules\admin\admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User }        from '../users/entities/user.entity';
import { Order }       from '../orders/entities/order.entity';
import { Product }     from '../packs/entities/product.entity';
import { Category }    from '../packs/entities/category.entity';
import { Pack }        from '../packs/entities/pack.entity';
import { PackProduct } from '../packs/entities/pack-product.entity';
import { Service }     from '../services/entities/service.entity';
import { Formation }   from '../formations/entities/formation.entity';
import { Video }       from '../formations/entities/video.entity';
import { Booking }     from '../bookings/entities/booking.entity';
import { AuditLog }    from '../audit/entities/audit-log.entity';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Order, Product, Category, Pack, PackProduct,
      Service, Formation, Video, Booking, AuditLog,
    ]),
  ],
  providers:   [AdminService],
  controllers: [AdminController],
  exports:     [AdminService],
})
export class AdminModule {}
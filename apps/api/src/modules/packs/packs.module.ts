// .\.\apps\api\src\modules\packs\packs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacksController } from './packs.controller';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { PacksService } from './packs.service';
import { Pack } from './entities/pack.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { PackProduct } from './entities/pack-product.entity';
import { StockAlertObserver } from './observers/stock-alert.observer';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pack, Product, Category, PackProduct]),
    NotificationsModule,
  ],
  controllers: [PacksController, ProductsController, CategoriesController],
  providers: [PacksService, StockAlertObserver],
  exports: [PacksService],
})
export class PacksModule {}
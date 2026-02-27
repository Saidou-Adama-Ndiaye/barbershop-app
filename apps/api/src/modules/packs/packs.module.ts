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

@Module({
  imports: [
    TypeOrmModule.forFeature([Pack, Product, Category, PackProduct]),
  ],
  controllers: [PacksController, ProductsController, CategoriesController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
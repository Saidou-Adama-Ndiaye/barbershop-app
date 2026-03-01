// .\.\apps\api\src\modules\packs\products.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PacksService } from './packs.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly packsService: PacksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste de tous les produits actifs' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  findAll(@Query('categoryId') categoryId?: string) {
    return this.packsService.findAllProducts(categoryId);
  }
}
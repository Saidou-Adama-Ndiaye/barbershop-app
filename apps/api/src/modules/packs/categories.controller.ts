import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PacksService } from './packs.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly packsService: PacksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste de toutes les catégories actives' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  findAll() {
    return this.packsService.findAllCategories();
  }
}
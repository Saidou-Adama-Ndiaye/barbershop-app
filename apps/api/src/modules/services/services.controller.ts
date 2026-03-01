// .\.\apps\api\src\modules\services\services.controller.ts
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des formules disponibles' })
  @ApiResponse({ status: 200, description: 'Liste des services actifs' })
  findAll() {
    return this.servicesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une formule' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id);
  }
}
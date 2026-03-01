// .\.\apps\api\src\modules\packs\packs.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PacksService } from './packs.service';
import { CreatePackDto } from './dto/create-pack.dto';
import { UpdatePackDto } from './dto/update-pack.dto';
import { CalculatePackDto } from './dto/calculate-pack.dto';
import { QueryPackDto } from './dto/query-pack.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Packs')
@Controller('packs')
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  // ─── GET /packs ───────────────────────────────────────────
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste paginée des packs actifs' })
  @ApiQuery({ name: 'category', required: false, example: 'barbe' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Liste des packs' })
  findAll(@Query() query: QueryPackDto) {
    return this.packsService.findAll(query);
  }

  // ─── GET /packs/:slug ─────────────────────────────────────
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Détail d\'un pack par son slug' })
  @ApiParam({ name: 'slug', example: 'pack-rasage-pro' })
  @ApiResponse({ status: 200, description: 'Détail du pack avec produits' })
  @ApiResponse({ status: 404, description: 'Pack introuvable' })
  findOne(@Param('slug') slug: string) {
    return this.packsService.findBySlug(slug);
  }

  // ─── POST /packs/:id/calculate ────────────────────────────
  @Public()
  @Post(':id/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculer le prix d\'un pack avec personnalisations' })
  @ApiParam({ name: 'id', description: 'UUID du pack' })
  @ApiResponse({ status: 200, description: 'Prix calculé avec breakdown' })
  @ApiResponse({ status: 400, description: 'Produit obligatoire non retirable' })
  calculatePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculatePackDto,
  ) {
    return this.packsService.calculatePackPrice(id, dto);
  }

  // ─── POST /packs (admin) ──────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Créer un nouveau pack' })
  @ApiResponse({ status: 201, description: 'Pack créé' })
  @ApiResponse({ status: 400, description: 'Slug déjà utilisé' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  create(@Body() dto: CreatePackDto) {
    return this.packsService.create(dto);
  }

  // ─── PATCH /packs/:id (admin) ─────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Modifier un pack' })
  @ApiParam({ name: 'id', description: 'UUID du pack' })
  @ApiResponse({ status: 200, description: 'Pack modifié' })
  @ApiResponse({ status: 404, description: 'Pack introuvable' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackDto,
  ) {
    return this.packsService.update(id, dto);
  }
}
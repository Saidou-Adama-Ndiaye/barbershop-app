// apps\api\src\modules\coiffeur\coiffeur.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import {
  IsNumber, IsString, IsOptional, IsBoolean,
  Min, Max, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CoiffeurService } from './coiffeur.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

// ─── DTOs ─────────────────────────────────────────────────
export class CreateAvailabilityDto {
  @ApiProperty({ example: 1, description: '0=Dim, 1=Lun ... 6=Sam' })
  @IsNumber()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:MM requis' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:MM requis' })
  endTime: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:MM requis' })
  startTime?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:MM requis' })
  endTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ─── Interface AuthUser ───────────────────────────────────
interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

// ─── Controllers ─────────────────────────────────────────

@ApiTags('Coiffeur')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COIFFEUR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('coiffeur')
export class CoiffeurController {
  constructor(private readonly coiffeurService: CoiffeurService) {}

  // ─── GET /coiffeur/dashboard ──────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard du coiffeur : RDV jour, stats semaine/mois' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.coiffeurService.getDashboard(user.id);
  }

  // ─── GET /coiffeur/rdv ────────────────────────────────
  @Get('rdv')
  @ApiOperation({ summary: 'Liste RDV filtrée (today/week/month/all)' })
  @ApiQuery({ name: 'filter', enum: ['today', 'week', 'month', 'all'], required: false })
  getBookings(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter: 'today' | 'week' | 'month' | 'all' = 'today',
  ) {
    return this.coiffeurService.getBookings(user.id, filter);
  }

  // ─── GET /coiffeur/clients ────────────────────────────
  @Get('clients')
  @ApiOperation({ summary: 'Liste des clients récurrents du coiffeur' })
  getClients(@CurrentUser() user: AuthUser) {
    return this.coiffeurService.getClients(user.id);
  }

  // ─── GET /coiffeur/clients/:clientId/history ─────────
  @Get('clients/:clientId/history')
  @ApiOperation({ summary: 'Historique RDV d\'un client avec notes' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  getClientHistory(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.coiffeurService.getClientHistory(user.id, clientId);
  }

  // ─── GET /coiffeur/stats ──────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques coiffeur : CA mensuel, taux no-show, fidélité' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.coiffeurService.getStats(user.id);
  }
}

// ─── Controller séparé pour /staff/availability ──────────
@ApiTags('Coiffeur')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COIFFEUR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('staff')
export class StaffAvailabilityController {
  constructor(private readonly coiffeurService: CoiffeurService) {}

  // ─── GET /staff/availability ──────────────────────────
  @Get('availability')
  @ApiOperation({ summary: 'Mes plages horaires de disponibilité' })
  getAvailability(@CurrentUser() user: AuthUser) {
    return this.coiffeurService.getAvailability(user.id);
  }

  // ─── POST /staff/availability ─────────────────────────
  @Post('availability')
  @ApiOperation({ summary: 'Créer/remplacer une plage horaire pour un jour' })
  @ApiResponse({ status: 201, description: 'Plage créée' })
  createAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.coiffeurService.createAvailability(user.id, dto);
  }

  // ─── PATCH /staff/availability/:id ───────────────────
  @Patch('availability/:id')
  @ApiOperation({ summary: 'Modifier une plage horaire' })
  @ApiResponse({ status: 404, description: 'Plage introuvable' })
  updateAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.coiffeurService.updateAvailability(user.id, id, dto);
  }

  // ─── DELETE /staff/availability/:id ──────────────────
  @Delete('availability/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une plage horaire' })
  @ApiResponse({ status: 204, description: 'Plage supprimée' })
  deleteAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coiffeurService.deleteAvailability(user.id, id);
  }
}
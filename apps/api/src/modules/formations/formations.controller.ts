import {
  Controller, Get, Post, Body, Param,
  Query, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { FormationsService } from './formations.service';
import { QueryFormationDto } from './dto/query-formation.dto';
import { TrackProgressDto } from './dto/track-progress.dto';
import { CreateFormationDto } from './dto/create-formation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Formations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  // ─── GET /formations ───────────────────────────────────
  @Public()
  @Get()
  @ApiOperation({ summary: 'Catalogue formations avec filtres' })
  findAll(@Query() query: QueryFormationDto) {
    return this.formationsService.findAll(query);
  }

  // ─── GET /formations/:slug ─────────────────────────────
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Détail formation (sans storage_key)' })
  findOne(@Param('slug') slug: string) {
    return this.formationsService.findBySlug(slug);
  }

  // ─── POST /formations ──────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une formation (admin)' })
  create(
    @Body() dto: CreateFormationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formationsService.create(dto, user.id);
  }

  // ─── POST /formations/:id/enroll ──────────────────────
  @Post(':id/enroll')
  @ApiOperation({ summary: 'Acheter une formation' })
  @ApiResponse({ status: 201, description: 'Paiement initié' })
  @ApiResponse({ status: 409, description: 'Déjà inscrit' })
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formationsService.enroll(id, user.id);
  }

  // ─── GET /formations/:id/videos/:videoId/stream ───────
  @Get(':id/videos/:videoId/stream')
  @ApiOperation({ summary: 'URL signée pour streamer une vidéo (15min)' })
  @ApiResponse({ status: 200, description: '{ url, expiresIn: 900 }' })
  @ApiResponse({ status: 403, description: 'Non inscrit à la formation' })
  getStream(
    @Param('id',      ParseUUIDPipe) id: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formationsService.getSignedVideoUrl(id, videoId, user.id);
  }
}

// ─── Controller séparé pour /videos/:id/progress ─────────
import { Controller as NestController } from '@nestjs/common';

@ApiTags('Videos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@NestController('videos')
export class VideosController {
  constructor(private readonly formationsService: FormationsService) {}

  @Post(':id/progress')
  @ApiOperation({ summary: 'Sauvegarder progression vidéo' })
  trackProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TrackProgressDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formationsService.trackProgress(id, user.id, dto);
  }
}

// ─── Controller pour /my-formations ──────────────────────
@ApiTags('Formations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@NestController('my-formations')
export class MyFormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes formations achetées avec progression' })
  getMyFormations(@CurrentUser() user: AuthUser) {
    return this.formationsService.getMyFormations(user.id);
  }
}
// apps/api/src/modules/reviews/reviews.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewStatus } from './entities/review.entity';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── POST /packs/:slug/reviews (auth requis) ─────────
  @Post('packs/:slug/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Soumettre un avis sur un pack' })
  create(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, slug, dto);
  }

  // ─── GET /packs/:slug/reviews (public) ───────────────
  @Get('packs/:slug/reviews')
  @Public()
  @ApiOperation({ summary: 'Lister les avis approuvés d\'un pack' })
  findByPack(@Param('slug') slug: string) {
    return this.reviewsService.findByPack(slug, true);
  }

  // ─── GET /admin/reviews (admin) ──────────────────────
  @Get('admin/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Lister tous les avis' })
  @ApiQuery({ name: 'status', enum: ReviewStatus, required: false })
  findAll(@Query('status') status?: ReviewStatus) {
    return this.reviewsService.findAll(status);
  }

  // ─── PATCH /reviews/:id/moderate (admin) ─────────────
  @Patch('reviews/:id/moderate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Modérer un avis (approuver/rejeter)' })
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, dto);
  }
}
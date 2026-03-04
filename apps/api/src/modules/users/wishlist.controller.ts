// apps/api/src/modules/users/wishlist.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { ToggleWishlistDto } from './dto/toggle-wishlist.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer ma wishlist' })
  findAll(@CurrentUser('id') userId: string) {
    return this.wishlistService.findAll(userId);
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle un pack dans la wishlist' })
  toggle(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleWishlistDto,
  ) {
    return this.wishlistService.toggle(userId, dto.packId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Récupérer les IDs des packs en wishlist' })
  getIds(@CurrentUser('id') userId: string) {
    return this.wishlistService.getPackIds(userId);
  }

  @Delete(':packId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un pack de la wishlist' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
  ) {
    return this.wishlistService.remove(userId, packId);
  }
}
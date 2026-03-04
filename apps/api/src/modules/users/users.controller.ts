// apps\api\src\modules\users\users.controller.ts
import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, UseGuards, UseInterceptors,
  UploadedFile, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

// ─── DTOs ─────────────────────────────────────────────────

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Moussa' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Diallo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+221771234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Maison' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  label: string;

  @ApiProperty({ example: 'Rue 10, Mermoz' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  street: string;

  @ApiProperty({ example: 'Dakar' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Sénégal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Bureau' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ example: 'Avenue Bourguiba' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: 'Dakar' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Sénégal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'AncienMotDePasse@2024' })
  @IsString()
  @MinLength(1, { message: 'Requis' })
  currentPassword: string;

  @ApiProperty({ example: 'NouveauMotDePasse@2025' })
  @IsString()
  @MinLength(8, { message: 'Minimum 8 caractères' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  newPassword: string;
}

// ─── Interface AuthUser ───────────────────────────────────
interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /users/staff ─────────────────────────────────
  @Public()
  @Get('staff')
  @ApiOperation({ summary: 'Liste des coiffeurs disponibles pour la réservation' })
  @ApiResponse({
    status: 200,
    description: 'Liste des coiffeurs actifs (id, firstName, lastName, role)',
  })
  getStaff() {
    return this.usersService.findStaff();
  }

  // ─── GET /users/me ────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findById(user.id);
  }

  // ─── PATCH /users/me ──────────────────────────────────
  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 409, description: 'Téléphone déjà utilisé' })
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ─── POST /users/me/avatar ────────────────────────────
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Uploader son avatar (resize 200×200 automatique)' })
  @ApiResponse({ status: 200, description: 'Avatar uploadé' })
  @ApiResponse({ status: 400, description: 'Format non supporté ou fichier trop grand' })
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }
    return this.usersService.uploadAvatar(user.id, file.buffer, file.mimetype);
  }

  // ─── GET /users/me/addresses ──────────────────────────
  @Get('me/addresses')
  @ApiOperation({ summary: 'Liste des adresses de livraison' })
  @ApiResponse({ status: 200, description: 'Liste des adresses' })
  getAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.getAddresses(user.id);
  }

  // ─── POST /users/me/addresses ─────────────────────────
  @Post('me/addresses')
  @ApiOperation({ summary: 'Ajouter une adresse de livraison' })
  @ApiResponse({ status: 201, description: 'Adresse créée' })
  createAddress(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  // ─── PATCH /users/me/addresses/:id ───────────────────
  @Patch('me/addresses/:id')
  @ApiOperation({ summary: 'Modifier une adresse de livraison' })
  @ApiResponse({ status: 200, description: 'Adresse mise à jour' })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  // ─── DELETE /users/me/addresses/:id ──────────────────
  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une adresse de livraison' })
  @ApiResponse({ status: 204, description: 'Adresse supprimée' })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  deleteAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }

  // ─── PATCH /users/me/password ─────────────────────────
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Changer son mot de passe depuis le profil' })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié' })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Mot de passe modifié avec succès' };
  }

  // ─── GET /users/me/avatar-url ─────────────────────────
  @Get('me/avatar-url')
  @ApiOperation({ summary: 'URL signée pour afficher l\'avatar (15min)' })
  @ApiResponse({ status: 200, description: '{ url: string } ou { url: null }' })
  async getAvatarUrl(@CurrentUser() user: AuthUser) {
    const dbUser = await this.usersService.findById(user.id);
    if (!dbUser?.avatarUrl) {
      return { url: null };
    }
    const url = await this.usersService.getAvatarSignedUrl(dbUser.avatarUrl);
    return { url };
  }
}
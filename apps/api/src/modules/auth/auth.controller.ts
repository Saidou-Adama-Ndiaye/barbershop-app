// apps\api\src\modules\auth\auth.controller.ts
import {
  Controller, Post, Get, Body, Req, Res,
  Param, UseGuards, HttpCode, HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiCookieAuth, ApiParam,
} from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  RegisterResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

// ─── DTOs nouveaux ────────────────────────────────────────
export class ForgotPasswordDto {
  @ApiProperty({ example: 'client@barbershop.sn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NouveauMotDePasse@2025' })
  @IsString()
  @MinLength(8, { message: 'Minimum 8 caractères' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  password: string;
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/register ──────────────────────────────
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau compte client' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  // ─── POST /auth/login ─────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter et obtenir les tokens' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress: string =
      (typeof forwardedFor === 'string' ? forwardedFor : undefined) ??
      req.socket.remoteAddress ??
      '';
    const userAgent: string = req.headers['user-agent'] ?? '';

    const result = await this.authService.login(dto, { ipAddress, userAgent });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    return {
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      user:         result.user,
    };
  }

  // ─── POST /auth/refresh ───────────────────────────────
  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renouveler l'access token via le refresh token (cookie)" })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const rawRefreshToken =
      req.cookies?.['refresh_token'] ?? body?.refreshToken;

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const result = await this.authService.refresh(rawRefreshToken);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    return { accessToken: result.accessToken };
  }

  // ─── POST /auth/logout ────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Se déconnecter et révoquer le refresh token' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['refresh_token'];
    await this.authService.logout(userId, rawRefreshToken);
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Déconnexion réussie' };
  }

  // ─── GET /auth/me ─────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Obtenir le profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getProfile(
    @CurrentUser() user: Record<string, unknown>,
  ): Record<string, unknown> {
    return user;
  }

  // ─── GET /auth/verify-email/:token ────────────────────
  @Public()
  @Get('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vérifier l'adresse email via token" })
  @ApiParam({ name: 'token', description: 'Token de vérification reçu par email' })
  @ApiResponse({ status: 200, description: 'Email vérifié' })
  @ApiResponse({ status: 400, description: 'Token invalide ou déjà utilisé' })
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ─── POST /auth/resend-verification ───────────────────
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Renvoyer l'email de vérification" })
  @ApiResponse({ status: 200, description: 'Email renvoyé' })
  @ApiResponse({ status: 400, description: 'Email déjà vérifié' })
  resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerification(userId);
  }

  // ─── POST /auth/forgot-password ───────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un lien de réinitialisation de mot de passe' })
  @ApiResponse({ status: 200, description: 'Lien envoyé si email valide' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ─── POST /auth/reset-password/:token ─────────────────
  @Public()
  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  @ApiParam({ name: 'token', description: 'Token reçu par email' })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  resetPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, dto.password);
  }
}
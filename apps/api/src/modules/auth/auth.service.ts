// apps\api\src\modules\auth\auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { RefreshJwtPayload } from './strategies/refresh-jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // ─── Register ────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      email:     dto.email,
      password:  dto.password,
      firstName: dto.firstName,
      lastName:  dto.lastName,
      phone:     dto.phone,
    });

    // Générer token de vérification email
    const verificationToken = crypto.randomUUID();
    await this.usersService.setVerificationToken(user.id, verificationToken);

    // Envoyer email de vérification (fire-and-forget)
    this.notificationsService.sendEmail({
      to:       user.email,
      subject:  '✉️ Vérifiez votre adresse email — BarberShop',
      template: 'verify-email',
      userId:   user.id,
      data: {
        firstName:         user.firstName,
        verificationUrl:   `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/verify-email/${verificationToken}`,
        expiresInHours:    48,
      },
    }).catch(() => null);

    this.auditService.log({
      userId:     user.id,
      action:     'REGISTER',
      entityType: 'User',
      entityId:   user.id,
    });

    return { message: 'Inscription réussie', userId: user.id };
  }

  // ─── Login ───────────────────────────────────────────────
  async login(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      this.auditService.log({
        userId:    user.id,
        action:    'LOGIN_FAILED',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata:  { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const { accessToken, refreshToken, refreshTokenId } =
      this.generateTokens(user.id, user.email, user.role, user.firstName, user.lastName);

    await this.saveRefreshToken({
      userId:    user.id,
      tokenId:   refreshTokenId,
      rawToken:  refreshToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.usersService.updateLastLogin(user.id);

    this.auditService.log({
      userId:     user.id,
      action:     'LOGIN',
      entityType: 'User',
      entityId:   user.id,
      ipAddress:  meta.ipAddress,
      userAgent:  meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        firstName:  user.firstName,
        lastName:   user.lastName,
        isVerified: user.isVerified,
        createdAt:  user.createdAt,
      },
    };
  }

  // ─── Refresh ─────────────────────────────────────────────
  async refresh(rawRefreshToken: string) {
    let payload: RefreshJwtPayload;
    try {
      payload = this.jwtService.verify<RefreshJwtPayload>(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        id:      payload.tokenId,
        userId:  payload.sub,
        tokenHash,
        revoked: false,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token révoqué ou invalide');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expiré');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilisateur introuvable ou désactivé');
    }

    await this.refreshTokenRepository.update(storedToken.id, { revoked: true });

    const { accessToken, refreshToken, refreshTokenId } =
      this.generateTokens(user.id, user.email, user.role, user.firstName, user.lastName);

    await this.saveRefreshToken({
      userId:  user.id,
      tokenId: refreshTokenId,
      rawToken: refreshToken,
    });

    return { accessToken, refreshToken };
  }

  // ─── Logout ──────────────────────────────────────────────
  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.refreshTokenRepository.update(
        { userId, tokenHash, revoked: false },
        { revoked: true },
      );
    } else {
      await this.refreshTokenRepository.update(
        { userId, revoked: false },
        { revoked: true },
      );
    }

    this.auditService.log({
      userId,
      action:     'LOGOUT',
      entityType: 'User',
      entityId:   userId,
    });
  }

  // ─── Vérification email ───────────────────────────────────
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Token de vérification invalide ou déjà utilisé');
    }

    await this.usersService.markEmailVerified(user.id);

    // Email confirmation vérification (fire-and-forget)
    this.notificationsService.sendEmail({
      to:       user.email,
      subject:  '✅ Email vérifié — BarberShop',
      template: 'verify-email-confirmed',
      userId:   user.id,
      data:     { firstName: user.firstName },
    }).catch(() => null);

    return { message: 'Email vérifié avec succès' };
  }

  // ─── Renvoi email de vérification ────────────────────────
  async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (user.isVerified) {
      throw new BadRequestException('Cet email est déjà vérifié');
    }

    const verificationToken = crypto.randomUUID();
    await this.usersService.setVerificationToken(user.id, verificationToken);

    this.notificationsService.sendEmail({
      to:       user.email,
      subject:  '✉️ Vérifiez votre adresse email — BarberShop',
      template: 'verify-email',
      userId:   user.id,
      data: {
        firstName:       user.firstName,
        verificationUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/verify-email/${verificationToken}`,
        expiresInHours:  48,
      },
    }).catch(() => null);

    return { message: 'Email de vérification renvoyé' };
  }

  // ─── Forgot Password ─────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Toujours retourner le même message (sécurité anti-énumération)
    const genericMessage = 'Si cet email existe, un lien de réinitialisation a été envoyé';

    if (!user) return { message: genericMessage };

    const resetToken   = crypto.randomUUID();
    const expiresAt    = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await this.usersService.setResetPasswordToken(user.id, resetToken, expiresAt);

    this.notificationsService.sendEmail({
      to:       user.email,
      subject:  '🔐 Réinitialisation de mot de passe — BarberShop',
      template: 'forgot-password',
      userId:   user.id,
      data: {
        firstName: user.firstName,
        resetUrl:  `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/reset-password/${resetToken}`,
        expiresInMinutes: 60,
      },
    }).catch(() => null);

    this.auditService.log({
      userId:     user.id,
      action:     'FORGOT_PASSWORD',
      entityType: 'User',
      entityId:   user.id,
    });

    return { message: genericMessage };
  }

  // ─── Reset Password ──────────────────────────────────────
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetPasswordExpiresAt) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    if (new Date() > user.resetPasswordExpiresAt) {
      throw new BadRequestException('Ce lien a expiré. Veuillez en demander un nouveau.');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Email confirmation changement mot de passe (fire-and-forget)
    this.notificationsService.sendEmail({
      to:       user.email,
      subject:  '🔒 Mot de passe modifié — BarberShop',
      template: 'password-changed',
      userId:   user.id,
      data: {
        firstName: user.firstName,
        changedAt: new Date().toLocaleString('fr-SN'),
        loginUrl:  `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/login`,
      },
    }).catch(() => null);

    this.auditService.log({
      userId:     user.id,
      action:     'RESET_PASSWORD',
      entityType: 'User',
      entityId:   user.id,
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // ─── generateTokens ──────────────────────────────────────
  generateTokens(
    userId: string,
    email: string,
    role: string,
    firstName: string,
    lastName: string,
  ): { accessToken: string; refreshToken: string; refreshTokenId: string } {
    const refreshTokenId = crypto.randomUUID();

    const payload: JwtPayload = { sub: userId, email, role, firstName, lastName };

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
    const accessToken = this.jwtService.sign(payload as any, {
      secret:    this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, tokenId: refreshTokenId } as any,
      {
        secret:    this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      },
    );
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

    return { accessToken, refreshToken, refreshTokenId };
  }

  // ─── Helpers privés ──────────────────────────────────────
  private async saveRefreshToken(data: {
    userId:     string;
    tokenId:    string;
    rawToken:   string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const tokenHash = this.hashToken(data.rawToken);

    const refreshToken = this.refreshTokenRepository.create({
      id:        data.tokenId,
      userId:    data.userId,
      tokenHash,
      expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
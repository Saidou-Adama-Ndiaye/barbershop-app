import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // ─── Register ────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    await this.auditService.log({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      message: 'Inscription réussie',
      userId: user.id,
    };
  }

  // ─── Login ───────────────────────────────────────────────
  async login(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Récupérer le user AVEC son password_hash
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 3. Vérifier que le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // 4. Générer les tokens
    const { accessToken, refreshToken, refreshTokenId } =
      await this.generateTokens(user.id, user.email, user.role);

    // 5. Sauvegarder le refresh token hashé en base
    await this.saveRefreshToken({
      userId: user.id,
      tokenId: refreshTokenId,
      rawToken: refreshToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // 6. Mettre à jour last_login_at
    await this.usersService.updateLastLogin(user.id);

    // 7. Log d'audit
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    };
  }

  // ─── Refresh ─────────────────────────────────────────────
  async refresh(rawRefreshToken: string) {
    // 1. Décoder le token pour récupérer tokenId et userId
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    // 2. Hasher le token reçu pour comparer avec la base
    const tokenHash = this.hashToken(rawRefreshToken);

    // 3. Vérifier en base que le token existe et n'est pas révoqué
    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        id: payload.tokenId,
        userId: payload.sub,
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

    // 4. Récupérer le user
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilisateur introuvable ou désactivé');
    }

    // 5. Rotation : révoquer l'ancien token et en créer un nouveau
    await this.refreshTokenRepository.update(storedToken.id, {
      revoked: true,
    });

    const { accessToken, refreshToken, refreshTokenId } =
      await this.generateTokens(user.id, user.email, user.role);

    await this.saveRefreshToken({
      userId: user.id,
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
      // Révoquer TOUS les refresh tokens de l'utilisateur
      await this.refreshTokenRepository.update(
        { userId, revoked: false },
        { revoked: true },
      );
    }

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
    });
  }

  // ─── Helpers privés ──────────────────────────────────────

  async generateTokens(userId: string, email: string, role: string) {
    const refreshTokenId = crypto.randomUUID();

    const payload: JwtPayload = { sub: userId, email, role };

    // "as any" nécessaire : @nestjs/jwt v11 type expiresIn comme StringValue
    // (type branded) alors qu'en runtime c'est un string ordinaire
    const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
        { ...payload, tokenId: refreshTokenId },
        {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
            'JWT_REFRESH_EXPIRES_IN',
            '7d',
        ) as any,
        },
    );

    return { accessToken, refreshToken, refreshTokenId };
    }

  private async saveRefreshToken(data: {
    userId: string;
    tokenId: string;
    rawToken: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // +7 jours

    const tokenHash = this.hashToken(data.rawToken);

    const refreshToken = this.refreshTokenRepository.create({
      id: data.tokenId,
      userId: data.userId,
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
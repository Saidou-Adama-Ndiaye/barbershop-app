// .\.\apps\api\src\modules\auth\auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

// ─── Mocks ────────────────────────────────────────────────

const mockUser = {
  id: 'uuid-user-001',
  email: 'test@barbershop.sn',
  firstName: 'Moussa',
  lastName: 'Diallo',
  role: UserRole.CLIENT,
  isActive: true,
  isVerified: false,
  createdAt: new Date('2025-01-01'),
  passwordHash: '$2b$12$hashedpassword',
  comparePassword: jest.fn(),
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  findById: jest.fn(),
  updateLastLogin: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test_jwt_secret_32_chars_minimum_ok',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test_refresh_secret_32_chars_minimum',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key] ?? defaultVal;
  }),
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset tous les mocks avant chaque test
    jest.clearAllMocks();
  });

  // ─── register() ──────────────────────────────────────────

  describe('register()', () => {
    it('✅ doit créer un utilisateur avec des données valides', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'test@barbershop.sn',
        password: 'Test@2025!',
        firstName: 'Moussa',
        lastName: 'Diallo',
      });

      expect(result).toEqual({
        message: 'Inscription réussie',
        userId: mockUser.id,
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'test@barbershop.sn',
        password: 'Test@2025!',
        firstName: 'Moussa',
        lastName: 'Diallo',
        phone: undefined,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER' }),
      );
    });

    it('❌ doit lever ConflictException si email déjà utilisé', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Cet email est déjà utilisé'),
      );

      await expect(
        service.register({
          email: 'existing@barbershop.sn',
          password: 'Test@2025!',
          firstName: 'Moussa',
          lastName: 'Diallo',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login() ─────────────────────────────────────────────

  describe('login()', () => {
    const loginDto = {
      email: 'test@barbershop.sn',
      password: 'Test@2025!',
    };
    const meta = { ipAddress: '127.0.0.1', userAgent: 'Jest' };

    it('✅ doit retourner accessToken et user avec credentials valides', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('mock_access_token')
        .mockReturnValueOnce('mock_refresh_token');
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.login(loginDto, meta);

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role).toBe(UserRole.CLIENT);
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('❌ doit lever UnauthorizedException si utilisateur inexistant', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto, meta)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('❌ doit lever UnauthorizedException si mot de passe incorrect', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);
      mockAuditService.log.mockResolvedValue(undefined);

      await expect(service.login(loginDto, meta)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('❌ doit lever UnauthorizedException si compte désactivé', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmailWithPassword.mockResolvedValue(inactiveUser);
      inactiveUser.comparePassword = jest.fn().mockResolvedValue(true);

      await expect(service.login(loginDto, meta)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── validateUser via findByEmailWithPassword ─────────────

  describe('findByEmailWithPassword()', () => {
    it('✅ doit retourner null si utilisateur inexistant', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);
      const user =
        await mockUsersService.findByEmailWithPassword('nobody@test.sn');
      expect(user).toBeNull();
    });
  });

  // ─── generateTokens() ─────────────────────────────────────

  describe('generateTokens()', () => {
    it('✅ doit retourner accessToken, refreshToken et refreshTokenId', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('mock_access_token')
        .mockReturnValueOnce('mock_refresh_token');

      const result = service.generateTokens(
        'uuid-001',
        'test@barbershop.sn',
        UserRole.CLIENT,
        'Admin',
        'Systeme'
      );

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result).toHaveProperty('refreshTokenId');
      expect(typeof result.refreshTokenId).toBe('string');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  // ─── logout() ─────────────────────────────────────────────

  describe('logout()', () => {
    it('✅ doit révoquer le refresh token et logger LOGOUT', async () => {
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 1 });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.logout('uuid-user-001', 'raw_refresh_token');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT' }),
      );
    });

    it('✅ doit révoquer TOUS les tokens si rawRefreshToken absent', async () => {
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 2 });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.logout('uuid-user-001');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'uuid-user-001', revoked: false },
        { revoked: true },
      );
    });
  });
});

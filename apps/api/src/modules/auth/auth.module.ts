// .\.\apps\api\src\modules\auth\auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET manquant dans .env.local');

        // StringValue est un type branded de la lib "ms" utilisée par jsonwebtoken
        // Le cast via unknown est nécessaire car ConfigService retourne string
        // mais JwtModuleOptions attend StringValue — en runtime c'est identique
        const expiresIn = config.get<string>(
          'JWT_EXPIRES_IN',
          '15m',
        ) as unknown as JwtModuleOptions['signOptions'] extends {
          expiresIn?: infer E;
        }
          ? E
          : never;

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),

    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshJwtStrategy,
    JwtAuthGuard,
    RefreshAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

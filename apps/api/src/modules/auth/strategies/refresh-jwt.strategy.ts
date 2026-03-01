// .\.\apps\api\src\modules\auth\strategies\refresh-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshJwtPayload {
  sub: string;
  email: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET manquant dans .env.local');

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.['refresh_token'] as
            | string
            | undefined;
          if (!token) throw new UnauthorizedException('Refresh token manquant');
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };

    super(options);
  }

  validate(
    request: Request,
    payload: RefreshJwtPayload,
  ): RefreshJwtPayload & { refreshToken: string } {
    const refreshToken = request?.cookies?.['refresh_token'] as
      | string
      | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }
    return { ...payload, refreshToken };
  }
}

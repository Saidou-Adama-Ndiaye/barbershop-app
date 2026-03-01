// .\.\apps\api\src\modules\auth\strategies\jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET manquant dans .env.local');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // garanti string (plus undefined)
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id:        payload.sub,
      email:     payload.email,
      role:      payload.role,
      firstName: payload.firstName ?? '',
      lastName:  payload.lastName  ?? '',
    };
  }
}

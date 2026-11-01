import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvVars } from '../config/env.validation.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { JwtPayload, PublicUser } from './auth.types.js';
import { extractToken } from './token.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvVars, true>,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    if (!(await this.sessions.isActive(payload.sid, payload.sub))) {
      throw new UnauthorizedException();
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.auth.toPublicUser(user);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { SessionsService } from '../sessions/sessions.service.js';
import { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { BCRYPT_ROUNDS } from './auth.constants.js';
import { JwtPayload, PublicUser } from './auth.types.js';
import { SignInDto } from './dto/signin.dto.js';
import { SignUpDto } from './dto/signup.dto.js';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

const INVALID_CREDENTIALS = 'Invalid email or password';

const TIMING_EQUALIZER_HASH =
  '$2b$12$LO0S9KDynFgETvuWvUdHGuJkibqECr96qYOl.7GhVgkJjmosmFKru';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.buildResult(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const matches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? TIMING_EQUALIZER_HASH,
    );

    if (!user || !matches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.buildResult(user);
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        ignoreExpiration: true,
      });
    } catch {
      return;
    }
    await this.sessions.revoke(payload.sid);
  }

  toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private async buildResult(user: UserDocument): Promise<AuthResult> {
    const sid = await this.sessions.create(user.id);
    const payload: JwtPayload = { sub: user.id, sid };
    return {
      user: this.toPublicUser(user),
      accessToken: await this.jwt.signAsync(payload),
    };
  }
}

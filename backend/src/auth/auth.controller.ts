import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { EnvVars } from '../config/env.validation.js';
import { AUTH_COOKIE_NAME } from './auth.constants.js';
import { AuthResponse, PublicUser } from './auth.types.js';
import { AuthResult, AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { SignInDto } from './dto/signin.dto.js';
import { SignUpDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { extractToken } from './token.js';

const CREDENTIAL_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  @Post('signup')
  @Throttle(CREDENTIAL_THROTTLE)
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.startSession(res, await this.auth.signUp(dto));
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle(CREDENTIAL_THROTTLE)
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.startSession(res, await this.auth.signIn(dto));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(extractToken(req));

    const options = this.cookieOptions();
    delete options.maxAge;
    res.clearCookie(AUTH_COOKIE_NAME, options);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  private startSession(
    res: Response,
    { user, accessToken }: AuthResult,
  ): AuthResponse {
    res.cookie(AUTH_COOKIE_NAME, accessToken, this.cookieOptions());
    return { user };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }) * 1000,
    };
  }
}

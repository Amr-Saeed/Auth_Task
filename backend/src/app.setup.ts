import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { EnvVars } from './config/env.validation.js';

export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  if (config.get('TRUST_PROXY', { infer: true })) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) {
    app.enableCors({ origin: origins, credentials: true });
  }

  app.enableShutdownHooks();
}

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { EnvVars } from './config/env.validation.js';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  configureApp(app);

  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`API listening on :${port}`);
}

await bootstrap();

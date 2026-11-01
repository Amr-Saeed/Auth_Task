import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import type { Connection } from 'mongoose';

const MONGOOSE_CONNECTED = 1;

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check(): { status: 'ok' } {
    if (this.connection.readyState !== MONGOOSE_CONNECTED) {
      throw new ServiceUnavailableException('Database is not connected');
    }
    return { status: 'ok' };
  }
}

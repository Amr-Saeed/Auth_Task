import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { EnvVars } from '../config/env.validation.js';
import { Session } from './schemas/session.schema.js';

@Injectable()
export class SessionsService {
  private readonly lifetimeMs: number;

  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    config: ConfigService<EnvVars, true>,
  ) {
    this.lifetimeMs =
      config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }) * 1000;
  }

  async create(userId: string): Promise<string> {
    const session = await this.sessions.create({
      userId: new Types.ObjectId(userId),
      expiresAt: new Date(Date.now() + this.lifetimeMs),
    });
    return session.id;
  }

  async isActive(sessionId: string, userId: string): Promise<boolean> {
    if (!isValidObjectId(sessionId) || !isValidObjectId(userId)) return false;
    const found = await this.sessions.exists({
      _id: sessionId,
      userId,
      expiresAt: { $gt: new Date() },
    });
    return found !== null;
  }

  async revoke(sessionId: string): Promise<void> {
    if (!isValidObjectId(sessionId)) return;
    await this.sessions.deleteOne({ _id: sessionId });
  }
}

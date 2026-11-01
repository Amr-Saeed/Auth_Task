import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { CreateUserInput } from '../../src/users/users.service.js';

interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class InMemoryUsersService {
  private readonly records = new Map<string, InMemoryUser>();

  async create(input: CreateUserInput): Promise<InMemoryUser> {
    if ([...this.records.values()].some((user) => user.email === input.email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const user: InMemoryUser = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    };
    this.records.set(user.id, user);
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<InMemoryUser | null> {
    return [...this.records.values()].find((user) => user.email === email) ?? null;
  }
}

interface InMemorySession {
  userId: string;
}

export class InMemorySessionsService {
  private readonly records = new Map<string, InMemorySession>();

  get count(): number {
    return this.records.size;
  }

  async create(userId: string): Promise<string> {
    const id = randomUUID();
    this.records.set(id, { userId });
    return id;
  }

  async revoke(sessionId: string): Promise<void> {
    this.records.delete(sessionId);
  }

  async isActive(sessionId: string, userId: string): Promise<boolean> {
    return this.records.get(sessionId)?.userId === userId;
  }

  has(sessionId: string): boolean {
    return this.records.has(sessionId);
  }
}

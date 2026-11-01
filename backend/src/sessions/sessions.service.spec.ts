import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { EnvVars } from '../config/env.validation.js';
import { Session } from './schemas/session.schema.js';
import { SessionsService } from './sessions.service.js';

const USER_ID = new Types.ObjectId().toString();
const SESSION_ID = new Types.ObjectId().toString();

function setup(lifetimeSeconds = 3600) {
  const model = {
    create: vi.fn(async (doc: unknown) => ({
      ...(doc as object),
      id: SESSION_ID,
    })),
    exists: vi.fn(async () => ({ _id: SESSION_ID }) as unknown),
    deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
  };
  const config = { get: () => lifetimeSeconds } as unknown as ConfigService<
    EnvVars,
    true
  >;
  const service = new SessionsService(
    model as unknown as Model<Session>,
    config,
  );
  return { service, model };
}

describe('SessionsService', () => {
  afterEach(() => vi.useRealTimers());

  it('creates a session that expires after the configured lifetime', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { service, model } = setup(3600);

    const id = await service.create(USER_ID);

    expect(id).toBe(SESSION_ID);
    const doc = model.create.mock.calls[0][0] as {
      userId: Types.ObjectId;
      expiresAt: Date;
    };
    expect(doc.userId.toString()).toBe(USER_ID);
    expect(doc.expiresAt.toISOString()).toBe('2026-01-01T01:00:00.000Z');
  });

  it('treats a session as active only if it belongs to the user and has not expired', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { service, model } = setup();

    expect(await service.isActive(SESSION_ID, USER_ID)).toBe(true);
    expect(model.exists).toHaveBeenCalledWith({
      _id: SESSION_ID,
      userId: USER_ID,
      expiresAt: { $gt: new Date('2026-01-01T00:00:00Z') },
    });
  });

  it('is inactive when Mongo finds no matching session', async () => {
    const { service, model } = setup();
    model.exists.mockResolvedValueOnce(null);
    expect(await service.isActive(SESSION_ID, USER_ID)).toBe(false);
  });

  it.each([undefined, '', 'not-an-object-id', 'session-1'])(
    'rejects session id %j without querying the database',
    async (sessionId) => {
      const { service, model } = setup();
      expect(await service.isActive(sessionId as string, USER_ID)).toBe(false);
      expect(model.exists).not.toHaveBeenCalled();
    },
  );

  it('revokes by deleting the record', async () => {
    const { service, model } = setup();
    await service.revoke(SESSION_ID);
    expect(model.deleteOne).toHaveBeenCalledWith({ _id: SESSION_ID });
  });

  it('does not query when revoking an invalid id', async () => {
    const { service, model } = setup();
    await service.revoke('nope');
    expect(model.deleteOne).not.toHaveBeenCalled();
  });
});

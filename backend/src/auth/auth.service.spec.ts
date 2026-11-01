import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { InMemorySessionsService, InMemoryUsersService } from '../../test/support/in-memory-users.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const SECRET = 'unit-test-secret-unit-test-secret!!';

describe('AuthService', () => {
  let service: AuthService;
  let users: InMemoryUsersService;
  let sessions: InMemorySessionsService;
  let jwt: JwtService;

  beforeEach(() => {
    users = new InMemoryUsersService();
    sessions = new InMemorySessionsService();
    jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: 60 } });
    service = new AuthService(
      users as unknown as UsersService,
      sessions as unknown as SessionsService,
      jwt,
    );
  });

  const signUp = () =>
    service.signUp({ email: 'amr@example.com', name: 'Amr', password: 'Str0ng!pass' });

  describe('signUp', () => {
    it('stores a bcrypt hash, never the plaintext password', async () => {
      await signUp();
      const stored = await users.findByEmailWithPassword('amr@example.com');
      expect(stored?.passwordHash).not.toContain('Str0ng!pass');
      expect(await bcrypt.compare('Str0ng!pass', stored!.passwordHash)).toBe(true);
    });

    it('returns a public user without credentials', async () => {
      const { user } = await signUp();
      expect(user).toEqual({
        id: expect.any(String),
        name: 'Amr',
        email: 'amr@example.com',
        createdAt: expect.any(Date),
      });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('issues a token tied to a newly created session', async () => {
      const { user, accessToken } = await signUp();
      const payload = await jwt.verifyAsync(accessToken);
      expect(payload).toMatchObject({ sub: user.id, sid: expect.any(String) });
      expect(sessions.has(payload.sid)).toBe(true);
    });

    it('does not put the email or any credential in the token', async () => {
      const { accessToken } = await signUp();
      const payload = await jwt.verifyAsync(accessToken);
      expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sid', 'sub']);
    });

    it('rejects a duplicate email', async () => {
      await signUp();
      await expect(signUp()).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('signIn', () => {
    beforeEach(async () => {
      await signUp();
    });

    it('accepts the right credentials', async () => {
      const result = await service.signIn({ email: 'amr@example.com', password: 'Str0ng!pass' });
      expect(result.user.email).toBe('amr@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
    });

    it('rejects a wrong password', async () => {
      await expect(
        service.signIn({ email: 'amr@example.com', password: 'wrong-password1!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('gives an identical error for an unknown email, so accounts cannot be enumerated', async () => {
      const unknown = await service
        .signIn({ email: 'nobody@example.com', password: 'Str0ng!pass' })
        .catch((error: UnauthorizedException) => error);
      const wrong = await service
        .signIn({ email: 'amr@example.com', password: 'wrong-password1!' })
        .catch((error: UnauthorizedException) => error);

      expect(unknown).toBeInstanceOf(UnauthorizedException);
      expect((unknown as UnauthorizedException).message).toBe((wrong as UnauthorizedException).message);
    });
  });

  describe('logout', () => {
    it('deletes the session behind the token', async () => {
      const { accessToken } = await signUp();
      expect(sessions.count).toBe(1);

      await service.logout(accessToken);
      expect(sessions.count).toBe(0);
    });

    it('only ends the session it was given, not the same user\'s other sessions', async () => {
      const first = await signUp();
      const second = await service.signIn({ email: 'amr@example.com', password: 'Str0ng!pass' });
      expect(sessions.count).toBe(2);

      await service.logout(first.accessToken);
      const secondSid = (await jwt.verifyAsync(second.accessToken)).sid;
      expect(sessions.count).toBe(1);
      expect(sessions.has(secondSid)).toBe(true);
    });

    it('still revokes when the token itself has already expired', async () => {
      const { user } = await signUp();
      const sid = await sessions.create(user.id);
      const expired = await jwt.signAsync({ sub: user.id, sid }, { expiresIn: -10 });

      await service.logout(expired);
      expect(sessions.has(sid)).toBe(false);
    });

    it('ignores a token signed with another secret, so ids cannot be revoked by forgery', async () => {
      const { user } = await signUp();
      const sid = await sessions.create(user.id);
      const forged = await new JwtService({ secret: 'some-other-secret-some-other-secret' }).signAsync({
        sub: user.id,
        sid,
      });

      await service.logout(forged);
      expect(sessions.has(sid)).toBe(true);
    });

    it.each([null, '', 'garbage'])('does nothing for %j', async (token) => {
      await signUp();
      await expect(service.logout(token)).resolves.toBeUndefined();
      expect(sessions.count).toBe(1);
    });
  });
});

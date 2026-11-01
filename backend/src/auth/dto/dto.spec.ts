import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignInDto } from './signin.dto.js';
import { SignUpDto } from './signup.dto.js';

const valid = { email: 'amr@example.com', name: 'Amr', password: 'Str0ng!pass' };

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SignUpDto, { ...valid, ...payload });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('SignUpDto', () => {
  it('accepts a valid payload', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  describe('email', () => {
    it.each(['not-an-email', 'a@', '@b.com', 'a b@c.com', ''])('rejects "%s"', async (email) => {
      expect(await errorsFor({ email })).toContain('Email must be a valid email address');
    });

    it('trims and lowercases', () => {
      const dto = plainToInstance(SignUpDto, { ...valid, email: '  Amr@Example.COM ' });
      expect(dto.email).toBe('amr@example.com');
    });
  });

  describe('name', () => {
    it('rejects fewer than 3 characters', async () => {
      expect(await errorsFor({ name: 'Al' })).toContain('Name must be at least 3 characters');
    });

    it('measures length after trimming', async () => {
      expect(await errorsFor({ name: ' Al ' })).toContain('Name must be at least 3 characters');
    });

    it('accepts exactly 3 characters', async () => {
      expect(await errorsFor({ name: 'Amr' })).toEqual([]);
    });
  });

  describe('password', () => {
    it.each([
      ['too short', 'Ab1!xyz', 'Password must be at least 8 characters'],
      ['no letter', '12345678!', 'Password must contain at least one letter'],
      ['no number', 'Password!', 'Password must contain at least one number'],
      ['no special character', 'Password1', 'Password must contain at least one special character'],
    ])('rejects a password with %s', async (_label, password, message) => {
      expect(await errorsFor({ password })).toContain(message);
    });

    it('accepts exactly 8 characters meeting every rule', async () => {
      expect(await errorsFor({ password: 'abcdef1!' })).toEqual([]);
    });

    it('rejects more than 72 characters (bcrypt truncates silently past that)', async () => {
      const password = `Aa1!${'x'.repeat(69)}`;
      expect(await errorsFor({ password })).toContain('Password must be at most 72 characters');
    });

    it('reports every broken rule at once', async () => {
      const messages = await errorsFor({ password: 'abc' });
      expect(messages).toEqual(
        expect.arrayContaining([
          'Password must be at least 8 characters',
          'Password must contain at least one number',
          'Password must contain at least one special character',
        ]),
      );
    });
  });
});

describe('SignInDto', () => {
  it('does not re-apply password complexity rules', async () => {
    const dto = plainToInstance(SignInDto, { email: 'a@b.com', password: 'x' });
    expect(await validate(dto)).toEqual([]);
  });

  it('requires a password', async () => {
    const dto = plainToInstance(SignInDto, { email: 'a@b.com', password: '' });
    expect(await validate(dto)).not.toEqual([]);
  });
});

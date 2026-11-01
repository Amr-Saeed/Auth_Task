import { validateEnv } from './env.validation.js';

const base = {
  MONGODB_URI: 'mongodb://localhost:27017/auth',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies safe defaults', () => {
    const env = validateEnv(base);
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_EXPIRES_IN_SECONDS: 3600,
      CORS_ORIGINS: '',
      COOKIE_SECURE: false,
      TRUST_PROXY: false,
      LOG_LEVEL: 'debug',
    });
  });

  it('turns on secure cookies and quieter logs in production', () => {
    const env = validateEnv({ ...base, NODE_ENV: 'production' });
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('lets COOKIE_SECURE be overridden explicitly', () => {
    const env = validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('requires MONGODB_URI', () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow('MONGODB_URI is required');
  });

  it.each([undefined, '', 'short', 'x'.repeat(31)])('rejects JWT_SECRET %j', (secret) => {
    expect(() => validateEnv({ ...base, JWT_SECRET: secret })).toThrow(/JWT_SECRET/);
  });

  it.each(['abc', '-1', '0', '1.5'])('rejects PORT %j', (port) => {
    expect(() => validateEnv({ ...base, PORT: port })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});

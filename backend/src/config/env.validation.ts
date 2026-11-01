export interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  CORS_ORIGINS: string;
  COOKIE_SECURE: boolean;
  TRUST_PROXY: boolean;
  LOG_LEVEL: string;
}

const DEFAULT_JWT_SECRET_ERROR =
  'JWT_SECRET must be set to a random string of at least 32 characters';

function toInt(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const env = (key: string): string | undefined => {
    const value = config[key];
    return typeof value === 'string' ? value : undefined;
  };

  const nodeEnv = env('NODE_ENV') ?? 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be development, production or test, got "${nodeEnv}"`,
    );
  }

  const mongoUri = env('MONGODB_URI');
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  const jwtSecret = env('JWT_SECRET');
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(DEFAULT_JWT_SECRET_ERROR);
  }

  return {
    NODE_ENV: nodeEnv as EnvVars['NODE_ENV'],
    PORT: toInt('PORT', env('PORT'), 3000),
    MONGODB_URI: mongoUri,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN_SECONDS: toInt(
      'JWT_EXPIRES_IN_SECONDS',
      env('JWT_EXPIRES_IN_SECONDS'),
      60 * 60,
    ),
    CORS_ORIGINS: env('CORS_ORIGINS') ?? '',
    COOKIE_SECURE:
      (env('COOKIE_SECURE') ?? String(nodeEnv === 'production')) === 'true',
    TRUST_PROXY: env('TRUST_PROXY') === 'true',
    LOG_LEVEL:
      env('LOG_LEVEL') ?? (nodeEnv === 'production' ? 'info' : 'debug'),
  };
}

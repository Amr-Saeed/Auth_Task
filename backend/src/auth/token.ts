import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants.js';

export function extractToken(req: Request): string | null {
  const cookie = (req?.cookies as Record<string, string> | undefined)?.[
    AUTH_COOKIE_NAME
  ];
  if (cookie) return cookie;

  const [scheme, value] = req?.headers?.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}

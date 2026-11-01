import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PublicUser } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser =>
    context.switchToHttp().getRequest<Request & { user: PublicUser }>().user,
);

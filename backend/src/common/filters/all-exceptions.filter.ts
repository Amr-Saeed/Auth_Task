import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { statusCode, error, message } = this.describe(exception);

    if (statusCode >= 500) {
      this.logger.error(
        { err: exception, path: req.originalUrl },
        'Unhandled exception',
      );
    }

    const body: ErrorBody = {
      statusCode,
      error,
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: typeof req.id === 'string' ? req.id : undefined,
    };
    res.status(statusCode).json(body);
  }

  private describe(
    exception: unknown,
  ): Pick<ErrorBody, 'statusCode' | 'error' | 'message'> {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode, error: exception.name, message: response };
      }
      const { error, message } = response as {
        error?: string;
        message?: string | string[];
      };
      return {
        statusCode,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong',
    };
  }
}

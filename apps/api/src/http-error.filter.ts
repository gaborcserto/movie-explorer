import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (status === 429 && typeof body === 'object' && 'retryAfter' in body) {
      const delay = body.retryAfter;

      if (
        typeof delay === 'number' &&
        Number.isSafeInteger(delay) &&
        delay > 0 &&
        delay <= 86_400
      ) {
        response.setHeader('Retry-After', String(delay));
      }
    }

    response
      .status(status)
      .json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
  }
}

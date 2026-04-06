import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body = typeof res === 'string'
        ? { statusCode: status, message: res, error: exception.name }
        : (res as object);

      this.logger.warn(`${request.method} ${request.url} → ${status}`);
      response.status(status).json(body);
    } else {
      this.logger.error(
        `${request.method} ${request.url} → 500 Unhandled exception`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
    }
  }
}

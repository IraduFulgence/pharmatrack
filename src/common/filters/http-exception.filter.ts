import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;

        // Handle class-validator errors
        if (Array.isArray(resp.message)) {
          message = 'Validation failed.';
          errors = {};
          for (const err of resp.message) {
            if (typeof err === 'string') {
              // Best effort key inference from message or general error
              const words = err.split(' ');
              const field = words[0] ? words[0].replace(/[^a-zA-Z0-9]/g, '') : 'general';
              // Convert to lower camelCase if needed, or keep descriptive
              const fieldKey = field ? field.charAt(0).toLowerCase() + field.slice(1) : 'general';
              if (!errors[fieldKey]) {
                errors[fieldKey] = err;
              }
            } else if (typeof err === 'object' && err !== null && err.property) {
              const constraints = err.constraints
                ? Object.values(err.constraints).join(', ')
                : 'Invalid value';
              errors[err.property] = constraints;
            }
          }
        } else if (resp.errors && typeof resp.errors === 'object') {
          message = resp.message || 'Validation failed.';
          errors = resp.errors;
        } else {
          message = resp.message || exception.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = 'An unexpected error occurred. Please try again later.';
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      message = 'Too many requests. Please try again later.';
    }

    const errorResponse: Record<string, any> = {
      success: false,
      message,
    };

    if (errors && Object.keys(errors).length > 0) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }
}


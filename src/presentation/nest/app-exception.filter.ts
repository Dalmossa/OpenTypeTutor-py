import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import { toAppError } from '../errors/toAppError.js';

const HTTP_CODE_TO_APP_ERROR: Readonly<Record<number, () => AppError>> = {
  [HttpStatus.BAD_REQUEST]: () => new AppError('VALIDATION_ERROR', 'Dados inválidos', 400),
  [HttpStatus.UNAUTHORIZED]: () => AppError.unauthorized('UNAUTHORIZED', 'Não autorizado'),
  [HttpStatus.FORBIDDEN]: () => AppError.forbidden('FORBIDDEN', 'Acesso negado'),
  [HttpStatus.NOT_FOUND]: () => AppError.notFound('NOT_FOUND', 'Rota não encontrada'),
  [HttpStatus.CONFLICT]: () => AppError.conflict('CONFLICT', 'Conflito'),
  [HttpStatus.UNPROCESSABLE_ENTITY]: () => AppError.unprocessable('VALIDATION_ERROR', 'Dados inválidos'),
  [HttpStatus.TOO_MANY_REQUESTS]: () => new AppError('TOO_MANY_REQUESTS', 'Muitas requisições', 429),
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    if (res.headersSent) {
      return;
    }

    const appError = toAppErrorMapping(exception);

    if (appError.statusCode >= 500) {
      const reason = exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
      console.error(`[error] ${appError.code}: ${appError.message} — ${reason}`);
    } else {
      console.warn(`[error] ${appError.code}: ${appError.message}`);
    }

    res.status(appError.statusCode).json(appError.toJSON());
  }
}

function toAppErrorMapping(exception: unknown): AppError {
  if (exception instanceof AppError) {
    return exception;
  }

  if (exception instanceof HttpException) {
    const mapper = HTTP_CODE_TO_APP_ERROR[exception.getStatus()];
    if (mapper) {
      return mapper();
    }
    const message = typeof exception.message === 'string' ? exception.message : 'Erro HTTP';
    return new AppError('HTTP_ERROR', message, exception.getStatus());
  }

  return toAppError(exception);
}
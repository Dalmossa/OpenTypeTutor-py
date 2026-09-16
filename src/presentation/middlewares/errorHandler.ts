import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { toAppError } from '../errors/toAppError.js';

export function createErrorHandler(): ErrorRequestHandler {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const appError = toAppError(error);

    if (appError.statusCode >= 500) {
      const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
      console.error(`[error] ${appError.code}: ${appError.message} — ${reason}`);
    } else {
      console.warn(`[error] ${appError.code}: ${appError.message}`);
    }

    res.status(appError.statusCode).json(appError.toJSON());
  };
}
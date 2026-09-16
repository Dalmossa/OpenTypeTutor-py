import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { IRateLimiter } from '../../application/ports/IRateLimiter.js';
import { AppError } from '../../shared/errors/AppError.js';
import { findByErrorCode } from '../../shared/errors/ERROR_CODES.js';

export interface RateLimitPolicy {
  keyPrefix: string;
  maxAttempts: number;
  windowMs: number;
}

const TOO_MANY_REQUESTS_CODE = 'TOO_MANY_REQUESTS';
const FALLBACK_MESSAGE = 'Muitas tentativas de login. Tente novamente mais tarde';
const FALLBACK_STATUS = 429;

export function createRateLimitMiddleware(
  limiter: IRateLimiter,
  policy: RateLimitPolicy
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip ?? 'unknown';
    const decision = limiter.consume(
      `${policy.keyPrefix}:${clientId}`,
      policy.maxAttempts,
      policy.windowMs
    );

    if (decision.allowed) {
      next();
      return;
    }

    const catalog = findByErrorCode(TOO_MANY_REQUESTS_CODE);
    res.setHeader('Retry-After', String(Math.ceil(decision.retryAfterMs / 1000)));
    res
      .status(catalog?.statusCode ?? FALLBACK_STATUS)
      .json(
        new AppError(
          TOO_MANY_REQUESTS_CODE,
          catalog?.message ?? FALLBACK_MESSAGE,
          catalog?.statusCode ?? FALLBACK_STATUS
        ).toJSON()
      );
  };
}
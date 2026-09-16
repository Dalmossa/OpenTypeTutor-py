import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createRateLimitMiddleware } from './rateLimitMiddleware.js';
import { InMemoryRateLimiter } from '../../infrastructure/rateLimit/InMemoryRateLimiter.js';
import type { IRateLimiter } from '../../application/ports/IRateLimiter.js';

interface ErrorBody {
  error: { code: string; message: string };
}

describe('rateLimitMiddleware (TASK-073 / ADR-013)', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;
  let statusMock: Mock<(code: number) => Response>;
  let jsonMock: Mock<(body: unknown) => Response>;
  let setHeaderMock: Mock<(name: string, value: string) => void>;

  beforeEach(() => {
    mockReq = { ip: '203.0.113.10' } as Request;
    statusMock = vi.fn();
    jsonMock = vi.fn();
    setHeaderMock = vi.fn();
    statusMock.mockReturnValue({ json: jsonMock } as unknown as Response);
    jsonMock.mockReturnThis();
    mockRes = { status: statusMock, json: jsonMock, setHeader: setHeaderMock } as unknown as Response;
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('RN dentro do limite → chama next() sem responder', () => {
    const limiter: IRateLimiter = { consume: () => ({ allowed: true, retryAfterMs: 0 }) };
    const middleware = createRateLimitMiddleware(limiter, {
      keyPrefix: 'login',
      maxAttempts: 5,
      windowMs: 60000,
    });

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('limite excedido → 429 TOO_MANY_REQUESTS com Retry-After e sem chamar next()', () => {
    const limiter: IRateLimiter = { consume: () => ({ allowed: false, retryAfterMs: 30000 }) };
    const middleware = createRateLimitMiddleware(limiter, {
      keyPrefix: 'login',
      maxAttempts: 1,
      windowMs: 60000,
    });

    middleware(mockReq, mockRes, mockNext);

    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalled();
    const body = jsonMock.mock.calls[0]?.[0] as ErrorBody | undefined;
    expect(body?.error).toEqual({
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de login. Tente novamente mais tarde',
    });
    expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', '30');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('compõe a chave com prefixo da política e IP do cliente', () => {
    const consume = vi.fn((_key: string, _limit: number, _windowMs: number) => ({
      allowed: true,
      retryAfterMs: 0,
    }));
    const limiter: IRateLimiter = { consume };
    const middleware = createRateLimitMiddleware(limiter, {
      keyPrefix: 'login',
      maxAttempts: 1,
      windowMs: 60000,
    });

    middleware(mockReq, mockRes, mockNext);

    expect(consume).toHaveBeenCalledWith('login:203.0.113.10', 1, 60000);
  });

  it('após expirar a janela, volta a permitir (janela fixa)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const middleware = createRateLimitMiddleware(new InMemoryRateLimiter(), {
      keyPrefix: 'login',
      maxAttempts: 1,
      windowMs: 60000,
    });

    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    middleware(mockReq, mockRes, mockNext);
    expect(statusMock).toHaveBeenCalledWith(429);

    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });
});
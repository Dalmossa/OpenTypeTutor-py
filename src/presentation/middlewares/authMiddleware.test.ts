import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Response, NextFunction } from 'express';
import { createAuthMiddleware } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { ITokenService } from '../../application/ports/ITokenService.js';

interface ErrorBody {
  error: { code: string };
}

function createTokenService(overrides: Partial<ITokenService> = {}): ITokenService {
  return {
    signAccessToken: () => 'access-token',
    signRefreshToken: () => 'refresh-token',
    verifyAccessToken: () => '550e8400-e29b-41d4-a716-446655440000',
    verifyRefreshToken: () => ({ userId: '', jti: '' }),
    revokeRefreshToken: () => undefined,
    ...overrides,
  };
}

describe('authMiddleware', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  let mockReq: AuthenticatedRequest;
  let mockRes: Response;
  let mockNext: NextFunction;
  let statusMock: Mock<(code: number) => Response>;
  let jsonMock: Mock<(body: unknown) => Response>;

  beforeEach(() => {
    mockReq = { headers: {} } as AuthenticatedRequest;
    statusMock = vi.fn();
    jsonMock = vi.fn();
    statusMock.mockReturnValue({ json: jsonMock } as unknown as Response);
    jsonMock.mockReturnThis();
    mockRes = { status: statusMock, json: jsonMock } as unknown as Response;
    mockNext = vi.fn();
  });

  function expectUnauthorizedCode(code: string): void {
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalled();
    const body = jsonMock.mock.calls[0]?.[0] as ErrorBody | undefined;
    expect(body?.error.code).toBe(code);
    expect(mockNext).not.toHaveBeenCalled();
  }

  describe('RN16 - endpoint protegido sem token válido → 401', () => {
    it('deve retornar 401 quando não há header Authorization', () => {
      const middleware = createAuthMiddleware(createTokenService());

      middleware(mockReq, mockRes, mockNext);

      expectUnauthorizedCode('UNAUTHORIZED');
    });

    it('deve retornar 401 quando header Authorization não começa com Bearer', () => {
      const middleware = createAuthMiddleware(createTokenService());
      mockReq.headers = { authorization: 'Basic abc123' };

      middleware(mockReq, mockRes, mockNext);

      expectUnauthorizedCode('UNAUTHORIZED');
    });

    it('deve retornar 401 quando token está vazio após Bearer', () => {
      const middleware = createAuthMiddleware(createTokenService());
      mockReq.headers = { authorization: 'Bearer ' };

      middleware(mockReq, mockRes, mockNext);

      expectUnauthorizedCode('UNAUTHORIZED');
    });

    it('deve retornar 401 quando token é inválido', () => {
      const tokenService = createTokenService({
        verifyAccessToken: () => {
          throw AppError.unauthorized('INVALID_TOKEN', 'Token de acesso inválido');
        },
      });
      const middleware = createAuthMiddleware(tokenService);
      mockReq.headers = { authorization: 'Bearer tokeninvalido' };

      middleware(mockReq, mockRes, mockNext);

      expectUnauthorizedCode('INVALID_TOKEN');
    });

    it('deve retornar 401 quando token está expirado', () => {
      const tokenService = createTokenService({
        verifyAccessToken: () => {
          throw AppError.unauthorized('TOKEN_EXPIRED', 'Token de acesso expirado');
        },
      });
      const middleware = createAuthMiddleware(tokenService);
      mockReq.headers = { authorization: 'Bearer tokeneexpirado' };

      middleware(mockReq, mockRes, mockNext);

      expectUnauthorizedCode('TOKEN_EXPIRED');
    });
  });

  describe('token válido', () => {
    it('deve chamar next() e anexar userId ao request', () => {
      const middleware = createAuthMiddleware(createTokenService());
      mockReq.headers = { authorization: 'Bearer tokenvalido' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.userId).toBe(testUserId);
    });

    it('deve extrair userId corretamente do token', () => {
      const outroUserId = '660e8400-e29b-41d4-a716-446655440001';
      const tokenService = createTokenService({ verifyAccessToken: () => outroUserId });
      const middleware = createAuthMiddleware(tokenService);
      mockReq.headers = { authorization: 'Bearer outrotoken' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.userId).toBe(outroUserId);
    });
  });
});
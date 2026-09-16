import type { Request, Response, NextFunction } from 'express';
import type { ITokenService } from '../../application/ports/ITokenService.js';
import { AppError } from '../../shared/errors/AppError.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function getAuthUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId;
  if (userId === undefined) {
    throw AppError.unauthorized('UNAUTHORIZED', 'Token de acesso não fornecido');
  }
  return userId;
}

export function createAuthMiddleware(tokenService: ITokenService) {
  return function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'UNAUTHORIZED', 'Token de acesso não fornecido');
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      sendUnauthorized(res, 'UNAUTHORIZED', 'Token de acesso não fornecido');
      return;
    }

    try {
      req.userId = tokenService.verifyAccessToken(token);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        sendUnauthorized(res, error.code, error.message);
        return;
      }
      sendUnauthorized(res, 'UNAUTHORIZED', 'Token de acesso inválido');
    }
  };
}

function sendUnauthorized(res: Response, code: string, message: string): void {
  res.status(401).json(AppError.unauthorized(code, message).toJSON());
}
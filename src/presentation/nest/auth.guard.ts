import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { ITokenService } from '../../application/ports/ITokenService.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { TOKENS } from './nestTokens.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKENS.TOKEN_SERVICE) private readonly tokenService: ITokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('UNAUTHORIZED', 'Token de acesso não fornecido');
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw AppError.unauthorized('UNAUTHORIZED', 'Token de acesso não fornecido');
    }

    try {
      req.userId = this.tokenService.verifyAccessToken(token);
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.unauthorized('UNAUTHORIZED', 'Token de acesso inválido');
    }
  }
}

export function getRequestUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId;
  if (userId === undefined) {
    throw AppError.unauthorized('UNAUTHORIZED', 'Token de acesso não fornecido');
  }
  return userId;
}
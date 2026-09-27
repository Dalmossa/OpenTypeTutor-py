import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import type { ITokenService } from "../../application/ports/ITokenService.js";
import { AppError } from "../../shared/errors/AppError.js";
import { TOKENS } from "./nestTokens.js";

/**
 * Request com o que o `AuthGuard` extrai do JWT.
 *
 * Vive aqui desde ADR-024. Antes ficava em `presentation/middlewares/authMiddleware.ts`,
 * ao lado do middleware Express que o Nest nunca usou — `AuthGuard` e `AdminGuard`
 * importavam o tipo de um arquivo morto, e o único consumidor do arquivo era a
 * pilha que foi removida.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: "user" | "admin";
}

const MISSING_TOKEN = "Token de acesso não fornecido";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKENS.TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("UNAUTHORIZED", MISSING_TOKEN);
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw AppError.unauthorized("UNAUTHORIZED", MISSING_TOKEN);
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      req.userId = payload.userId;
      req.role = payload.role;
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.unauthorized("UNAUTHORIZED", "Token de acesso inválido");
    }
  }
}

export function getRequestUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId;
  if (userId === undefined) {
    throw AppError.unauthorized("UNAUTHORIZED", MISSING_TOKEN);
  }
  return userId;
}

/**
 * Lido pelo `AdminGuard`, que pressupõe que o `AuthGuard` rodou antes — é ele que
 * popula `req.role`. Se `role` estiver ausente, a resposta é 401 e não 403: sem o
 * `AuthGuard` não há identidade autenticada nenhuma, e um 403 aqui diria ao
 * cliente que o papel foi avaliado quando não foi.
 */
export function getAuthUserRole(req: Request): "user" | "admin" {
  const role = (req as AuthenticatedRequest).role;
  if (role === undefined) {
    throw AppError.unauthorized("UNAUTHORIZED", MISSING_TOKEN);
  }
  return role;
}

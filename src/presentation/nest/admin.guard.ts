import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { getAuthUserRole } from "./auth.guard.js";

/**
 * Guarda de papel, lado Nest. O espelho em `middlewares/adminGuard.ts` foi
 * removido com a pilha Express (ADR-024).
 *
 * Depende de `AuthGuard` ter rodado antes: é ele que popula `req.role` a partir
 * do JWT. Por isso todo controller que usa este precisa dos DOIS guards, na
 * ordem `@UseGuards(AuthGuard, AdminGuard)` — com só o `AdminGuard`, `req.role`
 * fica `undefined` e o `getAuthUserRole` responde 401 em vez de 403.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (getAuthUserRole(req) !== "admin") {
      throw AppError.forbidden(
        "FORBIDDEN",
        "Acesso restrito a administradores",
      );
    }

    return true;
  }
}

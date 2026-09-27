import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AdminResetUserPasswordPort } from "../ports/useCasePorts.js";
import { adminResetUserPasswordSchema } from "../validators/authValidators.js";
import { parseSchema } from "../validation/zodErrorMap.js";
import { AdminGuard } from "./admin.guard.js";
import { AuthGuard } from "./auth.guard.js";
import { TOKENS } from "./nestTokens.js";

/**
 * RN16/RN17 - admin redefine a senha de outro usuário.
 *
 * O caminho é `/auth/admin/reset-user-password` porque o cliente web o trata
 * como operação de conta, mas a política de acesso é de admin — e por isso o
 * mount é declarado como `/auth/admin` numa classe **só sua**, em vez de uma
 * rota dentro do controller público de `/auth`. Ver a nota de
 * `PasswordResetNestController` para o porquê de não ser a mesma classe.
 *
 * `AdminGuard` pressupõe que `AuthGuard` rodou antes (é ele que popula
 * `req.role` a partir do JWT), então a ordem dos dois importa.
 */
@Controller("/auth/admin")
@UseGuards(AuthGuard, AdminGuard)
export class AuthAdminNestController {
  constructor(
    @Inject(TOKENS.ADMIN_RESET_USER_PASSWORD)
    private readonly adminResetUserPassword: AdminResetUserPasswordPort,
  ) {}

  @Post("reset-user-password")
  @HttpCode(200)
  async resetUserPassword(@Body() body: unknown): Promise<{ message: string }> {
    const parsed = parseSchema(adminResetUserPasswordSchema, body);
    return this.adminResetUserPassword.execute(parsed);
  }
}

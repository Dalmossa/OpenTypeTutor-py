import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import type {
  ConfirmPasswordResetPort,
  RequestPasswordResetPort,
} from "../ports/useCasePorts.js";
import {
  confirmPasswordResetSchema,
  requestPasswordResetSchema,
} from "../validators/authValidators.js";
import { parseSchema } from "../validation/zodErrorMap.js";
import { TOKENS } from "./nestTokens.js";

/**
 * RN16/RN17 - recuperação de senha.
 *
 * Controller separado de `AuthNestController` de propósito, e o motivo é
 * segurança, não estética: recuperação de senha é rota **pública** por design
 * (quem pede pode estar justamente sem sessão), enquanto
 * `POST /auth/admin/reset-user-password` é rota de **admin**. Quando as duas
 * famílias dividem a mesma classe, o `@UseGuards` da rota admin vira uma
 * decoration por método — fácil de não colocar, e o esquecimento é silencioso:
 * qualquer cliente anônimo com um `userId` redefine a senha de qualquer conta.
 * Foi exatamente o defeito corrigido no lado Express. Aqui a separação é
 * estrutural: cada classe tem uma política de acesso, aplicada no nível da
 * classe, valendo para todas as suas rotas por construção.
 */
@Controller("/auth")
export class PasswordResetNestController {
  constructor(
    @Inject(TOKENS.REQUEST_PASSWORD_RESET)
    private readonly requestPasswordReset: RequestPasswordResetPort,
    @Inject(TOKENS.CONFIRM_PASSWORD_RESET)
    private readonly confirmPasswordReset: ConfirmPasswordResetPort,
  ) {}

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() body: unknown): Promise<{ message: string }> {
    const parsed = parseSchema(requestPasswordResetSchema, body);
    return this.requestPasswordReset.execute(parsed);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() body: unknown): Promise<{ message: string }> {
    const parsed = parseSchema(confirmPasswordResetSchema, body);
    return this.confirmPasswordReset.execute(parsed);
  }
}

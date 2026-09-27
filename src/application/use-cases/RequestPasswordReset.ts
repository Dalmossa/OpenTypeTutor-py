import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";
import { Email } from "../../domain/value-objects/Email.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import type {
  RequestPasswordResetDTO,
  RequestPasswordResetResponseDTO,
} from "../dtos/PasswordResetDTOs.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";
import type { Clock } from "../dtos/PracticePacingDTOs.js";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "../../domain/config/authParams.js";

/** Mesma convenção de `infrastructure/logger/logger.ts`. */
const isDevelopment = process.env.NODE_ENV !== "production";

// RN16/RN17 - esqueci a senha: gera token de uso único, expira em 1h.
// O provedor de e-mail está fora de escopo (ADR-013), então em dev o token volta
// na resposta para dar fluxo ao teste. Em produção ele nunca é devolvido: o
// caminho real seria o e-mail transacional, e devolver o token na resposta seria
// um canal de vazamento. Logar também não serve — token em log é proibido.
export class RequestPasswordReset {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly tokenHasher: ITokenHasher,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(
    dto: RequestPasswordResetDTO,
  ): Promise<RequestPasswordResetResponseDTO> {
    const email = Email.create(dto.email);
    const user = await this.userRepository.findByEmail(email);

    // Não revelamos se o e-mail existe: a resposta é a mesma nos dois casos.
    if (!user) {
      return {
        message:
          "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
      };
    }

    const token = SessionId.create(); // UUID criptograficamente seguro
    const expiresAt = new Date(
      this.now().getTime() + PASSWORD_RESET_TOKEN_TTL_MS,
    );

    await this.tokenRepository.save(
      PasswordResetToken.create(
        {
          userId: user.id,
          tokenHash: this.tokenHasher.hash(token.value),
          expiresAt,
        },
        this.now(),
      ),
    );

    return {
      message:
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
      ...(isDevelopment ? { devToken: token.value } : {}),
    };
  }
}

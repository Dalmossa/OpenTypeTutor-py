import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";
import type { IPasswordHasher } from "../ports/IPasswordHasher.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";
import { UserNotFoundError } from "../../domain/errors/DomainError.js";
import {
  TokenExpiredError,
  TokenInvalidError,
  TokenAlreadyUsedError,
} from "../../domain/errors/DomainError.js";
import type {
  ConfirmPasswordResetDTO,
  ConfirmPasswordResetResponseDTO,
} from "../dtos/PasswordResetDTOs.js";
import type { Clock } from "../dtos/PracticePacingDTOs.js";

/**
 * Dependências agrupadas num objeto em vez de parâmetros posicionais.
 *
 * Com o quinto parâmetro (o `ITokenHasher`) a assinatura posicional estourava
 * `max-params ≤ 4`. Mesmo caminho de `AuthRouteGuards` em `createAuthRoutes`:
 * o objeto deixa a assinatura não estourar **e** nomeia as dependências, o que
 * impede trocar `passwordHasher` por `tokenHasher` em silêncio — ambos são
 * `{ hash(...) }` e o compilador não distingue os dois.
 */
export interface ConfirmPasswordResetDeps {
  userRepository: IUserRepository;
  tokenRepository: IPasswordResetTokenRepository;
  passwordHasher: IPasswordHasher;
  tokenHasher: ITokenHasher;
  now?: Clock;
}

export class ConfirmPasswordReset {
  private readonly userRepository: IUserRepository;
  private readonly tokenRepository: IPasswordResetTokenRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly tokenHasher: ITokenHasher;
  private readonly now: Clock;

  constructor(deps: ConfirmPasswordResetDeps) {
    this.userRepository = deps.userRepository;
    this.tokenRepository = deps.tokenRepository;
    this.passwordHasher = deps.passwordHasher;
    this.tokenHasher = deps.tokenHasher;
    this.now = deps.now ?? (() => new Date());
  }

  async execute(
    dto: ConfirmPasswordResetDTO,
  ): Promise<ConfirmPasswordResetResponseDTO> {
    const tokenHash = this.tokenHasher.hash(dto.token);
    const token = await this.tokenRepository.findByTokenHash(tokenHash);

    if (!token) {
      throw new TokenInvalidError("Token de recuperação inválido");
    }

    if (token.isExpired(this.now())) {
      throw new TokenExpiredError("Token de recuperação expirado");
    }

    if (token.isUsed()) {
      throw new TokenAlreadyUsedError("Token de recuperação já utilizado");
    }

    const user = await this.userRepository.findById(token.userId);
    if (!user) {
      throw new UserNotFoundError("Usuário não encontrado");
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
    await this.userRepository.updatePassword(user.id, newPasswordHash);

    // Marca token como usado
    const usedToken = token.markAsUsed(this.now());
    await this.tokenRepository.save(usedToken);

    return { message: "Senha redefinida com sucesso." };
  }
}

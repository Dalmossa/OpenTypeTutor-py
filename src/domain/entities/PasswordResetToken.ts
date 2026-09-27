import { SessionId } from "../value-objects/SessionId.js";
import { TokenAlreadyUsedError } from "../errors/DomainError.js";

export interface PasswordResetTokenProps {
  userId: SessionId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export class PasswordResetToken {
  readonly userId: SessionId;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;

  private constructor(props: PasswordResetTokenProps) {
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt ?? null;
  }

  /**
   * Cria um token **novo**. `expiresAt` precisa estar no futuro, e `now` é
   * injetado em vez de usar `new Date()` para que o Clock do caso de uso governe
   * a validação — com o relógio de parede, um teste com Clock mockada no passado
   * rejeitaria um token válido.
   */
  static create(
    props: PasswordResetTokenProps,
    now: Date = new Date(),
  ): PasswordResetToken {
    validateShape(props);

    if (props.expiresAt <= now) {
      throw new Error("expiresAt deve ser no futuro");
    }

    return new PasswordResetToken({
      userId: props.userId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      usedAt: props.usedAt ?? null,
    });
  }

  /**
   * Reidrata um token **vindo do storage**. Não valida `expiresAt` contra o
   * agora: um token expirado no banco é um fato, não uma intenção, e precisa
   * voltar para o caso de uso decidir o que reportar. Sem este caminho, ler um
   * token expirado estourava um `Error` cru dentro do repositório — que, sem
   * `code`, virava 500 em vez do 401 TOKEN_EXPIRED.
   */
  static rehydrate(props: PasswordResetTokenProps): PasswordResetToken {
    validateShape(props);
    return new PasswordResetToken({
      userId: props.userId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      usedAt: props.usedAt ?? null,
    });
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }

  markAsUsed(now: Date = new Date()): PasswordResetToken {
    if (this.isUsed()) {
      throw new TokenAlreadyUsedError("Token de recuperação já utilizado");
    }
    return new PasswordResetToken({
      userId: this.userId,
      tokenHash: this.tokenHash,
      expiresAt: this.expiresAt,
      usedAt: now,
    });
  }
}

/** Validações estruturais, comuns a `create` e `rehydrate`. */
function validateShape(props: PasswordResetTokenProps): void {
  if (!(props.userId instanceof SessionId)) {
    throw new Error("userId inválido");
  }
  if (!props.tokenHash) {
    throw new Error("tokenHash é obrigatório");
  }
  if (!(props.expiresAt instanceof Date)) {
    throw new Error("expiresAt inválido");
  }
}

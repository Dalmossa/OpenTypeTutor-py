import type { DataSource, Repository } from "typeorm";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";
import type { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import { SessionId as SessionIdValue } from "../../domain/value-objects/SessionId.js";
import { PasswordResetToken as PasswordResetTokenValue } from "../../domain/entities/PasswordResetToken.js";
import {
  PasswordResetTokenEntity,
  type PasswordResetTokenRow,
} from "../database/entities/index.js";

function toRow(token: PasswordResetToken): PasswordResetTokenRow {
  return {
    id: token.tokenHash, // usamos o hash como ID para lookup rápido
    userId: token.userId.value,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt.toISOString(),
    usedAt: token.usedAt?.toISOString() ?? null,
    createdAt: new Date().toISOString(), // createdAt não está no domínio, usamos now
  };
}

function fromRow(row: PasswordResetTokenRow): PasswordResetToken {
  // `rehydrate`, não `create`: um token expirado no banco precisa voltar para o
  // caso de uso reportar TOKEN_EXPIRED. Com `create`, a linha expirada estourava
  // um `Error` cru aqui dentro — sem `code`, virava 500 em vez de 401.
  return PasswordResetTokenValue.rehydrate({
    userId: SessionIdValue.create(row.userId),
    tokenHash: row.tokenHash,
    expiresAt: new Date(row.expiresAt),
    usedAt: row.usedAt !== null ? new Date(row.usedAt) : null,
  });
}

export class TypeOrmPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private readonly repo: Repository<PasswordResetTokenRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PasswordResetTokenEntity);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.repo.findOne({ where: { tokenHash } });
    return row === null ? null : fromRow(row);
  }

  async save(token: PasswordResetToken): Promise<void> {
    await this.repo.save(toRow(token));
  }
}

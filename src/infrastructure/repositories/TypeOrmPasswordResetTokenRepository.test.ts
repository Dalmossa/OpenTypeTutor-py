import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { DataSource } from "typeorm";
import { TypeOrmPasswordResetTokenRepository } from "./TypeOrmPasswordResetTokenRepository.js";
import { InMemoryUserRepository } from "./InMemoryUserRepository.js";
import { createTestDataSource } from "../database/testing.js";
import { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { ConfirmPasswordReset } from "../../application/use-cases/ConfirmPasswordReset.js";
import { RequestPasswordReset } from "../../application/use-cases/RequestPasswordReset.js";
import { RegisterUser } from "../../application/use-cases/RegisterUser.js";
import { AuthPasswordValidator } from "../auth/AuthPasswordValidator.js";
import { Sha256TokenHasher } from "../auth/Sha256TokenHasher.js";
import type { IPasswordHasher } from "../../application/ports/IPasswordHasher.js";
import type { ITokenHasher } from "../../application/ports/ITokenHasher.js";
import { toAppError } from "../../presentation/errors/toAppError.js";
import { TokenInvalidError } from "../../domain/errors/DomainError.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440050";
const TOKEN_HASH = "hashed-token-abc";
const NOW = new Date("2026-09-26T12:00:00.000Z");

/** Hasher determinístico: o teste é sobre o token, não sobre o bcrypt. */
const fakeHasher: IPasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  compare: (password, hash) => Promise.resolve(hash === `hashed:${password}`),
};

/**
 * `TOKEN_HASH` é gravado no banco e também passado como `token` do DTO, então
 * aqui o hasher precisa ser identidade para os dois lados coincidirem. É o
 * `Sha256TokenHasher` de verdade que cobre a hashing em `Sha256TokenHasher.test.ts`
 * e no e2e; repetir sha256 aqui só testaria o sha256 de novo.
 */
const identityTokenHasher: ITokenHasher = {
  hash: (token) => token,
};

/**
 * `DataSource.query` é `any`, e `no-unsafe-member-access` é erro. Lemos a
 * coluna por tipo explícito em vez de deixar o `any` fluir — o teste é sobre o
 * que está gravado, então tipar a leitura é parte do que ele verifica.
 */
interface TokenHashRow {
  tokenHash: string;
}

async function lerTokenHashesGravados(
  dataSource: DataSource,
): Promise<TokenHashRow[]> {
  return dataSource.query<TokenHashRow[]>(
    "SELECT tokenHash FROM password_reset_tokens",
  );
}

describe("TypeOrmPasswordResetTokenRepository", () => {
  let dataSource: DataSource;
  let repository: TypeOrmPasswordResetTokenRepository;

  beforeEach(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmPasswordResetTokenRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("lê token não usado preservando hash e validade", async () => {
    const expiresAt = new Date(NOW.getTime() + 60 * 60 * 1000);
    // `create` recebe `NOW` como relógio: com o relógio de parede, um token com
    // validade relativa a um NOW fixo no passado seria rejeitado como expirado.
    await repository.save(
      PasswordResetToken.create(
        {
          userId: SessionId.create(USER_ID),
          tokenHash: TOKEN_HASH,
          expiresAt,
        },
        NOW,
      ),
    );

    const found = await repository.findByTokenHash(TOKEN_HASH);

    expect(found).not.toBeNull();
    expect(found?.tokenHash).toBe(TOKEN_HASH);
    expect(found?.userId.value).toBe(USER_ID);
    expect(found?.usedAt).toBeNull();
  });

  it("lê token já usado preservando usedAt", async () => {
    const usedAt = new Date(NOW.getTime() - 5 * 60 * 1000);
    await repository.save(
      PasswordResetToken.rehydrate({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
        usedAt,
      }),
    );

    const found = await repository.findByTokenHash(TOKEN_HASH);

    expect(found?.isUsed()).toBe(true);
    expect(found?.usedAt?.toISOString()).toBe(usedAt.toISOString());
  });

  it("lê token EXPIRADO do banco sem lançar (o caso de uso decide o erro)", async () => {
    // Regressão: `fromRow` usava `PasswordResetToken.create`, que exige
    // `expiresAt` no futuro. Uma linha expirada — o caso mais comum, já passado o
    // TTL de 1h — estourava `Error('expiresAt deve ser no futuro')` dentro do
    // repositório. Sem `code`, esse erro virava AppError.internal e a rota
    // respondia 500 em vez de 401 TOKEN_EXPIRED.
    await repository.save(
      PasswordResetToken.rehydrate({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      }),
    );

    const found = await repository.findByTokenHash(TOKEN_HASH);

    expect(found).not.toBeNull();
    expect(found?.isExpired(NOW)).toBe(true);
  });

  it("cadeia completa: token expirado responde 401 TOKEN_EXPIRED, não 500", async () => {
    // O teste que amarra as três camadas: repositório (leitura) → caso de uso
    // (regra) → toAppError (mapeamento HTTP). Qualquer elo regredir para `Error`
    // cru e a resposta vira 500 — que é exatamente o defeito que este arquivo
    // fecha.
    const userRepository = new InMemoryUserRepository();
    await new RegisterUser(
      userRepository,
      fakeHasher,
      new AuthPasswordValidator(),
    ).execute({
      name: "João Silva",
      email: "joao@example.com",
      password: "senha-antiga-123",
    });

    await repository.save(
      PasswordResetToken.rehydrate({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      }),
    );

    const confirm = new ConfirmPasswordReset({
      userRepository,
      tokenRepository: repository,
      passwordHasher: fakeHasher,
      tokenHasher: identityTokenHasher,
      now: () => NOW,
    });

    const appError = toAppError(
      await confirm
        .execute({ token: TOKEN_HASH, newPassword: "senha-nova-123" })
        .catch((e: unknown) => e),
    );

    expect(appError.statusCode).toBe(401);
    expect(appError.code).toBe("TOKEN_EXPIRED");
    // A mensagem vem do próprio DomainError, não do catálogo: o catálogo tem
    // "Token de acesso expirado", que é do par access/refresh e mentiria aqui.
    expect(appError.message).toBe("Token de recuperação expirado");
  });

  it("não grava o token de recuperação em claro na tabela", async () => {
    // Regressão da dívida que este arquivo fecha: o `hashToken` dos casos de uso
    // era identidade (`return token`), então a coluna `tokenHash` guardava o
    // token em claro — quem lessesse o banco tinha o token de recuperação na
    // mão, sem precisar crackear nada.
    //
    // O teste vai pelo `RequestPasswordReset` real com o `Sha256TokenHasher` real
    // e lê a linha crua, porque asserção sobre o DTO não provaria nada: o
    // defeito era justamente o que chegava ao banco.
    const userRepository = new InMemoryUserRepository();
    await new RegisterUser(
      userRepository,
      fakeHasher,
      new AuthPasswordValidator(),
    ).execute({
      name: "Alvo",
      email: "alvo-token-claro@exemplo.com",
      password: "senha-antiga-123",
    });

    const resposta = await new RequestPasswordReset(
      userRepository,
      repository,
      new Sha256TokenHasher(),
      () => NOW,
    ).execute({ email: "alvo-token-claro@exemplo.com" });

    const tokenEmClaro = resposta.devToken;
    expect(tokenEmClaro).toBeDefined();

    const rows = await lerTokenHashesGravados(dataSource);
    expect(rows).toHaveLength(1);

    const gravado = rows[0]?.tokenHash ?? "";
    expect(gravado).not.toBe(tokenEmClaro);
    expect(gravado).toHaveLength(64);
    // E a busca pelo hash continua encontrando a linha, senão o hash serve só
    // para estragar o token: a confirmação do reset deixaria de funcionar.
    expect(await repository.findByTokenHash(gravado)).not.toBeNull();
  });

  it("o token cru do e-mail confirma o reset; o valor guardado no banco não", async () => {
    // Fecha o ciclo nas duas pontas:
    //
    //  1. O cliente manda o token cru (o que foi para o e-mail) e o servidor
    //     hasheia antes de buscar — o caminho feliz continua funcionando.
    //  2. O valor guardado na tabela **não** serve como token. Como o hash não
    //     é salgado, hashear o hash dá outro valor, e a busca não acha a linha.
    //     É o que garante que ler o banco não permite tomar conta da conta:
    //     quem roubar a tabela fica com um valor inútil para o atacante.
    const userRepository = new InMemoryUserRepository();
    await new RegisterUser(
      userRepository,
      fakeHasher,
      new AuthPasswordValidator(),
    ).execute({
      name: "Alvo2",
      email: "alvo-confirmar@exemplo.com",
      password: "senha-antiga-123",
    });

    const resposta = await new RequestPasswordReset(
      userRepository,
      repository,
      new Sha256TokenHasher(),
      () => NOW,
    ).execute({ email: "alvo-confirmar@exemplo.com" });

    const tokenEmClaro = resposta.devToken as string;
    const gravado =
      (await lerTokenHashesGravados(dataSource))[0]?.tokenHash ?? "";

    const confirmar = () =>
      new ConfirmPasswordReset({
        userRepository,
        tokenRepository: repository,
        passwordHasher: fakeHasher,
        tokenHasher: new Sha256TokenHasher(),
        now: () => new Date(NOW.getTime() + 60_000),
      });

    // (2) primeiro: o hash do banco não vale como token.
    await expect(
      confirmar().execute({ token: gravado, newPassword: "senha-nova-123" }),
    ).rejects.toThrow(TokenInvalidError);

    // (1) e o token cru do e-mail funciona.
    await expect(
      confirmar().execute({
        token: tokenEmClaro,
        newPassword: "senha-nova-123",
      }),
    ).resolves.toMatchObject({ message: "Senha redefinida com sucesso." });
  });
});

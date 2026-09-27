import { describe, it, expect } from "vitest";
import { PasswordResetToken } from "./PasswordResetToken.js";
import { SessionId } from "../value-objects/SessionId.js";
import { TokenAlreadyUsedError } from "../errors/DomainError.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TOKEN_HASH = "hashed-token-123";
const NOW = new Date();
const minutes = (m: number): number => m * 60 * 1000;

describe("PasswordResetToken", () => {
  it("create gera token válido", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    expect(token.userId.value).toBe(USER_ID);
    expect(token.tokenHash).toBe(TOKEN_HASH);
    expect(token.expiresAt).toEqual(new Date(NOW.getTime() + minutes(60)));
    expect(token.usedAt).toBeNull();
  });

  it("create rejeita userId inválido", () => {
    expect(() =>
      PasswordResetToken.create({
        userId: "not-a-session-id" as unknown as SessionId,
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() + minutes(60)),
      }),
    ).toThrow("userId inválido");
  });

  it("create rejeita tokenHash vazio", () => {
    expect(() =>
      PasswordResetToken.create({
        userId: SessionId.create(USER_ID),
        tokenHash: "",
        expiresAt: new Date(NOW.getTime() + minutes(60)),
      }),
    ).toThrow("tokenHash é obrigatório");
  });

  it("create rejeita expiresAt no passado", () => {
    expect(() =>
      PasswordResetToken.create({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() - minutes(10)),
      }),
    ).toThrow("expiresAt deve ser no futuro");
  });

  it("isExpired retorna false para token válido", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    expect(token.isExpired(new Date(NOW.getTime() + minutes(30)))).toBe(false);
  });

  it("isExpired retorna true para token expirado", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    expect(token.isExpired(new Date(NOW.getTime() + minutes(90)))).toBe(true);
  });

  it("isUsed retorna false para token novo", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    expect(token.isUsed()).toBe(false);
  });

  it("markAsUsed marca token como usado", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    const usedToken = token.markAsUsed(new Date(NOW.getTime() + minutes(30)));

    expect(usedToken.isUsed()).toBe(true);
    expect(usedToken.usedAt).toEqual(new Date(NOW.getTime() + minutes(30)));
    expect(token.isUsed()).toBe(false); // imutável
  });

  it("markAsUsed lança TokenAlreadyUsedError se token já usado", () => {
    const token = PasswordResetToken.create({
      userId: SessionId.create(USER_ID),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(NOW.getTime() + minutes(60)),
    });

    const usedToken = token.markAsUsed(new Date(NOW.getTime() + minutes(30)));

    // TokenAlreadyUsedError, e não `Error` cru: um erro sem `code` cai em
    // AppError.internal e vira 500 em vez do 409 TOKEN_ALREADY_USED.
    expect(() =>
      usedToken.markAsUsed(new Date(NOW.getTime() + minutes(40))),
    ).toThrow(TokenAlreadyUsedError);
    expect(() =>
      usedToken.markAsUsed(new Date(NOW.getTime() + minutes(40))),
    ).toThrow("Token de recuperação já utilizado");
  });

  describe("rehydrate", () => {
    it("reidrata token expirado sem lançar (o caso de uso decide o erro)", () => {
      // Este é o caminho do repositório TypeORM. Com `create`, ler um token
      // expirado do banco estourava `Error` cru e a rota respondia 500.
      const token = PasswordResetToken.rehydrate({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() - minutes(10)),
      });

      expect(token.isExpired(NOW)).toBe(true);
    });

    it("reidrata preservando usedAt", () => {
      const usedAt = new Date(NOW.getTime() - minutes(5));
      const token = PasswordResetToken.rehydrate({
        userId: SessionId.create(USER_ID),
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(NOW.getTime() + minutes(60)),
        usedAt,
      });

      expect(token.isUsed()).toBe(true);
      expect(token.usedAt).toEqual(usedAt);
    });

    it("create usa o `now` injetado, não o relógio de parede", () => {
      // Com Clock mockada no passado, `new Date()` interno rejeitaria o token.
      const past = new Date(NOW.getTime() - minutes(120));

      expect(() =>
        PasswordResetToken.create(
          {
            userId: SessionId.create(USER_ID),
            tokenHash: TOKEN_HASH,
            expiresAt: new Date(NOW.getTime() + minutes(60)),
          },
          past,
        ),
      ).not.toThrow();
    });
  });
});

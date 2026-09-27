import { describe, it, expect } from "vitest";
import {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  isRefreshTokenRevoked,
  RefreshTokenExpiredError,
  InvalidRefreshTokenError,
} from "./refreshToken.js";

describe("refreshToken", () => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  describe("generateRefreshToken", () => {
    it("deve gerar refresh token string", () => {
      const token = generateRefreshToken(testUserId);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("deve gerar tokens diferentes para o mesmo userId", () => {
      const token1 = generateRefreshToken(testUserId);
      const token2 = generateRefreshToken(testUserId);
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyRefreshToken", () => {
    it("deve verificar refresh token válido e retornar payload", () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);
      expect(payload.userId).toBe(testUserId);
      expect(payload).toHaveProperty("jti");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("deve lançar InvalidRefreshTokenError para token inválido", () => {
      expect(() => verifyRefreshToken("tokeninvalido")).toThrow(
        InvalidRefreshTokenError,
      );
    });

    it("deve lançar InvalidRefreshTokenError para token vazio", () => {
      expect(() => verifyRefreshToken("")).toThrow(InvalidRefreshTokenError);
    });

    it("deve lançar RefreshTokenExpiredError para token expirado", () => {
      const token = generateRefreshToken(testUserId, "-1s");
      expect(() => verifyRefreshToken(token)).toThrow(RefreshTokenExpiredError);
    });
  });

  describe("revokeRefreshToken", () => {
    it("deve revogar refresh token", () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);

      revokeRefreshToken(payload.jti);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(true);
    });

    it("deve revogar apenas o token específico", () => {
      const token1 = generateRefreshToken(testUserId);
      const token2 = generateRefreshToken(testUserId);
      const payload1 = verifyRefreshToken(token1);
      const payload2 = verifyRefreshToken(token2);

      revokeRefreshToken(payload1.jti);

      expect(isRefreshTokenRevoked(payload1.jti)).toBe(true);
      expect(isRefreshTokenRevoked(payload2.jti)).toBe(false);
    });
  });

  describe("isRefreshTokenRevoked", () => {
    it("deve retornar false para token não revogado", () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(false);
    });

    it("deve retornar true para token revogado", () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);
      revokeRefreshToken(payload.jti);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(true);
    });
  });

  describe("revokeAllRefreshTokensForUser", () => {
    // Um usuário por teste: o rastreio é estado de módulo, e um `userId`
    // compartilhado faria cada teste depender de quantos tokens os anteriores
    // deixaram pendentes.
    const user = (suffix: string) =>
      `550e8400-e29b-41d4-a716-44665544${suffix}`;

    it("revoga todos os tokens do usuário, de todos os dispositivos", () => {
      const alvo = user("0a1");
      const celular = generateRefreshToken(alvo);
      const notebook = generateRefreshToken(alvo);
      const tablet = generateRefreshToken(alvo);

      const revogados = revokeAllRefreshTokensForUser(alvo);

      expect(revogados).toBe(3);
      expect(() => verifyRefreshToken(celular)).toThrow(
        InvalidRefreshTokenError,
      );
      expect(() => verifyRefreshToken(notebook)).toThrow(
        InvalidRefreshTokenError,
      );
      expect(() => verifyRefreshToken(tablet)).toThrow(
        InvalidRefreshTokenError,
      );
    });

    it("não toca nos tokens de outro usuário", () => {
      const alvo = user("0b1");
      const bystander = user("0b2");
      const tokenAlvo = generateRefreshToken(alvo);
      const tokenBystander = generateRefreshToken(bystander);

      revokeAllRefreshTokensForUser(alvo);

      expect(() => verifyRefreshToken(tokenAlvo)).toThrow(
        InvalidRefreshTokenError,
      );
      expect(verifyRefreshToken(tokenBystander).userId).toBe(bystander);
    });

    it("devolve 0 para usuário sem token emitido", () => {
      expect(revokeAllRefreshTokensForUser(user("0c1"))).toBe(0);
    });

    it("token emitido após a revogação volta a valer", () => {
      const alvo = user("0d1");
      generateRefreshToken(alvo);
      revokeAllRefreshTokensForUser(alvo);

      const novo = generateRefreshToken(alvo);

      expect(verifyRefreshToken(novo).userId).toBe(alvo);
    });

    it("revogação por jti não revoga os demais tokens do usuário", () => {
      const alvo = user("0e1");
      const primeiro = generateRefreshToken(alvo);
      const segundo = generateRefreshToken(alvo);
      const payloadPrimeiro = verifyRefreshToken(primeiro);

      revokeRefreshToken(payloadPrimeiro.jti);

      expect(isRefreshTokenRevoked(payloadPrimeiro.jti)).toBe(true);
      expect(() => verifyRefreshToken(segundo)).not.toThrow();
      // O segundo segue rastreado: um revokeAll posterior ainda precisa pegá-lo.
      expect(revokeAllRefreshTokensForUser(alvo)).toBe(1);
    });
  });
});

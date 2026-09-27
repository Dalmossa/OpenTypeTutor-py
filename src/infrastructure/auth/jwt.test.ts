import { describe, it, expect } from "vitest";
import {
  signToken,
  verifyToken,
  TokenExpiredError,
  InvalidTokenError,
} from "./jwt.js";

describe("jwt", () => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  describe("signToken", () => {
    it("deve gerar token string", () => {
      const token = signToken(testUserId, "user");
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("deve gerar token com estrutura JWT válida (header.payload.signature)", () => {
      const token = signToken(testUserId, "user");
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
      const header = parts[0];
      expect(header).toBeDefined();
      const decoded = JSON.parse(
        Buffer.from(header ?? "", "base64url").toString(),
      ) as { alg: string };
      expect(decoded.alg).toBe("HS256");
    });
  });

  describe("verifyToken", () => {
    it("deve verificar token válido e retornar payload", () => {
      const token = signToken(testUserId, "user");
      const payload = verifyToken(token);
      expect(payload.userId).toBe(testUserId);
      expect(payload.role).toBe("user");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("deve lançar InvalidTokenError para token inválido", () => {
      expect(() => verifyToken("tokeninvalido")).toThrow(InvalidTokenError);
    });

    it("deve lançar InvalidTokenError para token vazio", () => {
      expect(() => verifyToken("")).toThrow(InvalidTokenError);
    });

    it("deve lançar InvalidTokenError para token com assinatura errada", () => {
      const parts = signToken(testUserId, "user").split(".");
      parts[2] = "assinaturaerrada";
      const tampered = parts.join(".");
      expect(() => verifyToken(tampered)).toThrow(InvalidTokenError);
    });

    it("deve lançar TokenExpiredError para token expirado", () => {
      const token = signToken(testUserId, "user", "-1s");
      expect(() => verifyToken(token)).toThrow(TokenExpiredError);
    });
  });
});

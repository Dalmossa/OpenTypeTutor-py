import { describe, it, expect } from 'vitest';
import {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isRefreshTokenRevoked,
  RefreshTokenExpiredError,
  InvalidRefreshTokenError,
} from './refreshToken.js';

describe('refreshToken', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  describe('generateRefreshToken', () => {
    it('deve gerar refresh token string', () => {
      const token = generateRefreshToken(testUserId);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('deve gerar tokens diferentes para o mesmo userId', () => {
      const token1 = generateRefreshToken(testUserId);
      const token2 = generateRefreshToken(testUserId);
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyRefreshToken', () => {
    it('deve verificar refresh token válido e retornar payload', () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);
      expect(payload.userId).toBe(testUserId);
      expect(payload).toHaveProperty('jti');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('deve lançar InvalidRefreshTokenError para token inválido', () => {
      expect(() => verifyRefreshToken('tokeninvalido')).toThrow(InvalidRefreshTokenError);
    });

    it('deve lançar InvalidRefreshTokenError para token vazio', () => {
      expect(() => verifyRefreshToken('')).toThrow(InvalidRefreshTokenError);
    });

    it('deve lançar RefreshTokenExpiredError para token expirado', () => {
      const token = generateRefreshToken(testUserId, '-1s');
      expect(() => verifyRefreshToken(token)).toThrow(RefreshTokenExpiredError);
    });
  });

  describe('revokeRefreshToken', () => {
    it('deve revogar refresh token', () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);

      revokeRefreshToken(payload.jti);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(true);
    });

    it('deve revogar apenas o token específico', () => {
      const token1 = generateRefreshToken(testUserId);
      const token2 = generateRefreshToken(testUserId);
      const payload1 = verifyRefreshToken(token1);
      const payload2 = verifyRefreshToken(token2);

      revokeRefreshToken(payload1.jti);

      expect(isRefreshTokenRevoked(payload1.jti)).toBe(true);
      expect(isRefreshTokenRevoked(payload2.jti)).toBe(false);
    });
  });

  describe('isRefreshTokenRevoked', () => {
    it('deve retornar false para token não revogado', () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(false);
    });

    it('deve retornar true para token revogado', () => {
      const token = generateRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);
      revokeRefreshToken(payload.jti);

      expect(isRefreshTokenRevoked(payload.jti)).toBe(true);
    });
  });
});

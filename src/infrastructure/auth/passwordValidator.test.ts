import { describe, it, expect } from 'vitest';
import { validatePassword, PasswordValidationError } from './passwordValidator.js';

describe('passwordValidator', () => {
  describe('RN18 - política mínima de senha', () => {
    it('deve aceitar senha com comprimento igual ao mínimo', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(true);
    });

    it('deve aceitar senha maior que o mínimo', () => {
      const result = validatePassword('senhaMuitoLonga123');
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar senha menor que o mínimo', () => {
      const result = validatePassword('1234567');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(PasswordValidationError.TOO_SHORT);
    });

    it('deve rejeitar senha vazia', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(PasswordValidationError.TOO_SHORT);
    });

    it('deve rejeitar senha undefined', () => {
      const result = validatePassword(undefined as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(PasswordValidationError.TOO_SHORT);
    });

    it('deve aceitar senha com caracteres especiais', () => {
      const result = validatePassword('!@#$%^&*()_+-=');
      expect(result.valid).toBe(true);
    });

    it('deve aceitar senha com espaços', () => {
      const result = validatePassword('minha senha segura');
      expect(result.valid).toBe(true);
    });

    it('deve aceitar senha com apenas números', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(true);
    });

    it('deve aceitar senha com apenas letras', () => {
      const result = validatePassword('abcdefgh');
      expect(result.valid).toBe(true);
    });
  });
});

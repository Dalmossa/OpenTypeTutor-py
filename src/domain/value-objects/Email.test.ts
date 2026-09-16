import { describe, it, expect } from 'vitest';
import { Email } from './Email.js';

describe('Email', () => {
  describe('PRD §6 - Value Object Email', () => {
    it('deve criar Email válido', () => {
      const email = Email.create('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    it('deve normalizar para lowercase', () => {
      const email = Email.create('USER@EXAMPLE.COM');
      expect(email.value).toBe('user@example.com');
    });

    it('deve remover espaços em branco', () => {
      const email = Email.create('  user@example.com  ');
      expect(email.value).toBe('user@example.com');
    });
  });

  describe('Igualdade', () => {
    it('Emails iguais (case-insensitive) devem ser iguais', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('USER@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });

    it('Emails diferentes não devem ser iguais', () => {
      const email1 = Email.create('user1@example.com');
      const email2 = Email.create('user2@example.com');
      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para email sem @', () => {
      expect(() => Email.create('userexample.com')).toThrow('Email inválido');
    });

    it('deve lançar erro para email sem domínio', () => {
      expect(() => Email.create('user@')).toThrow('Email inválido');
    });

    it('deve lançar erro para email sem parte local', () => {
      expect(() => Email.create('@example.com')).toThrow('Email inválido');
    });

    it('deve lançar erro para string vazia', () => {
      expect(() => Email.create('')).toThrow('Email inválido');
    });

    it('deve lançar erro para null/undefined', () => {
      expect(() => Email.create(null as unknown as string)).toThrow('Email inválido');
      expect(() => Email.create(undefined as unknown as string)).toThrow('Email inválido');
    });
  });

  describe('Serialização', () => {
    it('toString deve retornar o valor normalizado', () => {
      const email = Email.create('USER@EXAMPLE.COM');
      expect(email.toString()).toBe('user@example.com');
    });

    it('JSON serialization deve funcionar', () => {
      const email = Email.create('user@example.com');
      expect(JSON.stringify(email)).toBe('"user@example.com"');
    });
  });
});
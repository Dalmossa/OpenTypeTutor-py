import { describe, it, expect } from 'vitest';
import { SessionId } from './SessionId.js';

describe('SessionId', () => {
  describe('PRD §6–§9 - Value Object SessionId', () => {
    it('deve criar SessionId válido a partir de UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const sessionId = SessionId.create(uuid);
      expect(sessionId.value).toBe(uuid);
    });

    it('deve gerar novo SessionId quando não fornecido', () => {
      const sessionId = SessionId.create();
      expect(sessionId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('deve gerar UUIDs únicos', () => {
      const id1 = SessionId.create();
      const id2 = SessionId.create();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('Igualdade', () => {
    it('SessionIds iguais devem ser iguais', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = SessionId.create(uuid);
      const id2 = SessionId.create(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it('SessionIds diferentes não devem ser iguais', () => {
      const id1 = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
      const id2 = SessionId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para UUID inválido', () => {
      expect(() => SessionId.create('invalid-uuid')).toThrow('SessionId inválido');
    });

    it('deve lançar erro para string vazia', () => {
      expect(() => SessionId.create('')).toThrow('SessionId inválido');
    });

    it('deve lançar erro para null', () => {
      expect(() => SessionId.create(null as unknown as string)).toThrow('SessionId inválido');
    });

    it('deve gerar novo SessionId para undefined (tratado como não fornecido)', () => {
      const sessionId = SessionId.create();
      expect(sessionId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('deve aceitar UUID com letras maiúsculas', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const sessionId = SessionId.create(uuid);
      expect(sessionId.value).toBe(uuid.toLowerCase());
    });
  });

  describe('Serialização', () => {
    it('toString deve retornar o valor', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const sessionId = SessionId.create(uuid);
      expect(sessionId.toString()).toBe(uuid);
    });

    it('JSON serialization deve funcionar', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const sessionId = SessionId.create(uuid);
      expect(JSON.stringify(sessionId)).toBe(`"${uuid}"`);
    });
  });
});
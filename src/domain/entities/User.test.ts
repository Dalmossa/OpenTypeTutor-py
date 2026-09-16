import { describe, it, expect } from 'vitest';
import { User } from './User.js';
import { Email } from '../value-objects/Email.js';
import { SessionId } from '../value-objects/SessionId.js';

describe('User', () => {
  const validEmail = Email.create('user@example.com');
  const validPasswordHash = '$2b$12$hashedpassword';

  describe('PRD §6 - User entity', () => {
    it('deve criar User com todos os campos obrigatórios', () => {
      const user = User.create({
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });

      expect(user.name).toBe('João Silva');
      expect(user.email).toBe(validEmail);
      expect(user.passwordHash).toBe(validPasswordHash);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('deve gerar ID automaticamente se não fornecido', () => {
      const user = User.create({
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });

      expect(user.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('deve usar ID fornecido', () => {
      const customId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
      const user = User.create({
        id: customId,
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });

      expect(user.id).toBe(customId);
    });

    it('deve definir createdAt automaticamente', () => {
      const before = new Date();
      const user = User.create({
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });
      const after = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('RNF08 - passwordHash nunca exposto em DTO', () => {
    it('toDTO não deve incluir passwordHash', () => {
      const user = User.create({
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });

      const dto = user.toDTO();

      expect(dto).not.toHaveProperty('passwordHash');
      expect(dto.id).toBe(user.id.value);
      expect(dto.name).toBe('João Silva');
      expect(dto.email).toBe('user@example.com');
      expect(dto.createdAt).toBe(user.createdAt.toISOString());
    });

    it('toJSON não deve incluir passwordHash', () => {
      const user = User.create({
        name: 'João Silva',
        email: validEmail,
        passwordHash: validPasswordHash,
      });

      const json = JSON.parse(JSON.stringify(user)) as Record<string, unknown>;

      expect(json).not.toHaveProperty('passwordHash');
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para nome vazio', () => {
      expect(() =>
        User.create({
          name: '',
          email: validEmail,
          passwordHash: validPasswordHash,
        })
      ).toThrow('Nome é obrigatório');
    });

    it('deve lançar erro para nome apenas espaços', () => {
      expect(() =>
        User.create({
          name: '   ',
          email: validEmail,
          passwordHash: validPasswordHash,
        })
      ).toThrow('Nome é obrigatório');
    });

    it('deve lançar erro para email inválido', () => {
      expect(() =>
        User.create({
          name: 'João Silva',
          email: 'invalid' as unknown as Email,
          passwordHash: validPasswordHash,
        })
      ).toThrow();
    });

    it('deve lançar erro para passwordHash vazio', () => {
      expect(() =>
        User.create({
          name: 'João Silva',
          email: validEmail,
          passwordHash: '',
        })
      ).toThrow('Password hash é obrigatório');
    });
  });

  describe('Igualdade', () => {
    it('Users com mesmo ID devem ser iguais', () => {
      const id = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
      const user1 = User.create({ id, name: 'João', email: validEmail, passwordHash: validPasswordHash });
      const user2 = User.create({ id, name: 'Maria', email: validEmail, passwordHash: validPasswordHash });

      expect(user1.equals(user2)).toBe(true);
    });

    it('Users com IDs diferentes não devem ser iguais', () => {
      const user1 = User.create({ name: 'João', email: validEmail, passwordHash: validPasswordHash });
      const user2 = User.create({ name: 'João', email: validEmail, passwordHash: validPasswordHash });

      expect(user1.equals(user2)).toBe(false);
    });
  });
});
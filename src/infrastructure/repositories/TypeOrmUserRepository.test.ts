import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmUserRepository } from './TypeOrmUserRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { User } from '../../domain/entities/User.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Email } from '../../domain/value-objects/Email.js';

describe('TypeOrmUserRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmUserRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmUserRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const createUser = (overrides: Partial<{ id: string; email: string; name: string }> = {}) =>
    User.create({
      id: SessionId.create(overrides.id ?? '550e8400-e29b-41d4-a716-446655440010'),
      name: overrides.name ?? 'Maria Silva',
      email: Email.create(overrides.email ?? 'maria@example.com'),
      passwordHash: 'hash-bcrypt-de-test',
    });

  describe('round-trip de persistência', () => {
    it('deve salvar e recuperar usuário por id', async () => {
      const user = createUser({ id: '550e8400-e29b-41d4-a716-446655440011' });
      await repository.save(user);

      const found = await repository.findById(user.id);
      expect(found).not.toBeNull();
      expect(found?.id.equals(user.id)).toBe(true);
      expect(found?.name).toBe(user.name);
      expect(found?.email.equals(user.email)).toBe(true);
      expect(found?.passwordHash).toBe(user.passwordHash);
      expect(found?.createdAt.toISOString()).toBe(user.createdAt.toISOString());
    });

    it('deve recuperar por email', async () => {
      const user = createUser({ id: '550e8400-e29b-41d4-a716-446655440012', email: 'joao@example.com' });
      await repository.save(user);

      const found = await repository.findByEmail(user.email);
      expect(found?.name).toBe(user.name);
    });

    it('existsByEmail retorna true apenas quando o email existe', async () => {
      const user = createUser({ id: '550e8400-e29b-41d4-a716-446655440013', email: 'exists@example.com' });
      await repository.save(user);

      expect(await repository.existsByEmail(user.email)).toBe(true);
      expect(await repository.existsByEmail(Email.create('nao-existe@example.com'))).toBe(false);
    });

    it('findById retorna null para id inexistente', async () => {
      const notFound = await repository.findById(SessionId.create('550e8400-e29b-41d4-a716-446655440099'));
      expect(notFound).toBeNull();
    });

    it('deve atualizar usuário existente (mesmo id) sem duplicar', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440014';
      await repository.save(createUser({ id, name: 'Antes', email: 'antes@example.com' }));

      const updated = User.create({
        id: SessionId.create(id),
        name: 'Depois',
        email: Email.create('depois@example.com'),
        passwordHash: 'hash-novo',
      });
      await repository.save(updated);

      const found = await repository.findById(updated.id);
      expect(found?.name).toBe('Depois');

      const all = (await dataSource.query('SELECT id FROM users WHERE id = ?', [id])) as unknown as Array<{ id: string }>;
      expect(all).toHaveLength(1);
    });
  });
});
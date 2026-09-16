import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmUserProfileRepository } from './TypeOrmUserProfileRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { UserProfileEntity } from '../database/entities/index.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440020');

describe('TypeOrmUserProfileRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmUserProfileRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmUserProfileRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('deve salvar e recuperar perfil com layout e nível', async () => {
    const profile = UserProfile.create({ userId: USER_ID, activeLayout: Layout.create('ABNT2'), currentLevel: 3 });
    await repository.save(profile);

    const found = await repository.findByUserId(USER_ID);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(USER_ID)).toBe(true);
    expect(found?.activeLayout.value).toBe('ABNT2');
    expect(found?.currentLevel).toBe(3);
  });

  it('deve atualizar o layout no mesmo registro (sem duplicar)', async () => {
    const original = await repository.findByUserId(USER_ID);
    if (original === null) {
      throw new Error('perfil esperado na pré-condição');
    }

    const changed = original.changeLayout(Layout.create('US-INTERNATIONAL'));
    await repository.save(changed);

    const found = await repository.findByUserId(USER_ID);
    expect(found?.activeLayout.value).toBe('US-INTERNATIONAL');

    const count = await dataSource.getRepository(UserProfileEntity).count();
    expect(count).toBe(1);
  });

  it('findByUserId retorna null para usuário sem perfil', async () => {
    const missing = await repository.findByUserId(SessionId.create('550e8400-e29b-41d4-a716-446655440099'));
    expect(missing).toBeNull();
  });
});
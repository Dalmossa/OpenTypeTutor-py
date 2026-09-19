import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmKeyPerformanceRepository } from './TypeOrmKeyPerformanceRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440050');

describe('TypeOrmKeyPerformanceRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmKeyPerformanceRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmKeyPerformanceRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const createPerformance = (overrides: Partial<Parameters<typeof KeyPerformance.create>[0]> = {}) =>
    KeyPerformance.create({
      userId: USER_ID,
      logicalKey: 'a',
      layout: Layout.create('ABNT2'),
      attempts: 10,
      errors: 4,
      averageLatencyMs: 320,
      masteryState: 'WEAK',
      ...overrides,
    });

  it('round-trip preserva contadores e estado de mastery', async () => {
    const performance = createPerformance();
    await repository.save(performance);

    const found = await repository.findById(performance.id);
    expect(found).not.toBeNull();
    expect(found?.logicalKey).toBe('a');
    expect(found?.attempts).toBe(10);
    expect(found?.errors).toBe(4);
    expect(found?.averageLatencyMs).toBe(320);
    expect(found?.masteryState).toBe('WEAK');
  });

  it('save em (userId, logicalKey, layout) existente atualiza sem duplicar (unique)', async () => {
    const updated = createPerformance().recordAttempt({ isError: true, latencyMs: 350 });
    await repository.save(updated);

    const found = await repository.findByUserIdAndLogicalKey(USER_ID, 'a', Layout.create('ABNT2'));
    expect(found).not.toBeNull();
    expect(found?.attempts).toBe(11);
    expect(found?.errors).toBe(5);

    const all = (await dataSource.query('SELECT id FROM key_performances')) as unknown as Array<{ id: string }>;
    expect(all).toHaveLength(1);
    expect(found?.id.value).toBe(all[0]?.id);
  });

  it('findByUserIdAndLogicalKey distingue por layout', async () => {
    const usPerformance = createPerformance({ layout: Layout.create('US-INTERNATIONAL'), logicalKey: 's' });
    await repository.save(usPerformance);

    const abnt2 = await repository.findByUserIdAndLogicalKey(USER_ID, 'a', Layout.create('ABNT2'));
    const us = await repository.findByUserIdAndLogicalKey(USER_ID, 's', Layout.create('US-INTERNATIONAL'));
    expect(abnt2?.logicalKey).toBe('a');
    expect(us?.logicalKey).toBe('s');
    expect(
      await repository.findByUserIdAndLogicalKey(USER_ID, 'a', Layout.create('US-INTERNATIONAL'))
    ).toBeNull();
  });

  it('findByUserIdAndLayout filtra pelo layout ativo', async () => {
    const abnt2 = await repository.findByUserIdAndLayout(USER_ID, Layout.create('ABNT2'));
    const us = await repository.findByUserIdAndLayout(USER_ID, Layout.create('US-INTERNATIONAL'));

    expect(abnt2.map((kp) => kp.logicalKey)).toEqual(['a']);
    expect(us.map((kp) => kp.logicalKey)).toEqual(['s']);
  });

  it('findByUserId e findAllByUserId retornam os registros do usuário', async () => {
    const byUser = await repository.findByUserId(USER_ID);
    const allByUser = await repository.findAllByUserId(USER_ID);
    expect(byUser).toHaveLength(2);
    expect(allByUser).toHaveLength(2);
  });

  it('RN31 - deleteByUserId remove apenas o desempenho do usuário', async () => {
    const deleteUser = SessionId.create('550e8400-e29b-41d4-a716-446655440081');
    await repository.save(createPerformance({ userId: deleteUser, logicalKey: 'x' }));
    await repository.save(createPerformance({ userId: deleteUser, logicalKey: 'y' }));

    await repository.deleteByUserId(deleteUser);

    expect(await repository.findByUserId(deleteUser)).toHaveLength(0);
    expect(await repository.findByUserId(USER_ID)).toHaveLength(2);
  });
});
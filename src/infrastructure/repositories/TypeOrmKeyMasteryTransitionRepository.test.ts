import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmKeyMasteryTransitionRepository } from './TypeOrmKeyMasteryTransitionRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { KeyMasteryTransition } from '../../domain/entities/KeyMasteryTransition.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440024');
const ABNT2 = Layout.create('ABNT2');

describe('TypeOrmKeyMasteryTransitionRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmKeyMasteryTransitionRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmKeyMasteryTransitionRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('persiste e consulta transições por usuário e janela de datas', async () => {
    await repository.save(
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: ABNT2,
        date: '2026-01-01',
        from: 'LEARNING',
        to: 'CONSOLIDATING',
      })
    );
    await repository.save(
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'b',
        layout: ABNT2,
        date: '2026-02-01',
        from: 'CONSOLIDATING',
        to: 'MASTERED',
      })
    );

    const january = await repository.findByUserBetween(USER_ID, '2026-01-01', '2026-01-31');
    expect(january).toHaveLength(1);
    expect(january[0]?.logicalKey).toBe('a');
    expect(january[0]?.from).toBe('LEARNING');
    expect(january[0]?.to).toBe('CONSOLIDATING');

    const all = await repository.findByUserBetween(USER_ID, '2026-01-01', '2026-12-31');
    expect(all).toHaveLength(2);
  });

  it('isola por usuário (RN17)', async () => {
    const other = SessionId.create('550e8400-e29b-41d4-a716-446655440025');
    await repository.save(
      KeyMasteryTransition.create({
        userId: other,
        logicalKey: 'z',
        layout: ABNT2,
        date: '2026-01-01',
        from: 'UNKNOWN',
        to: 'LEARNING',
      })
    );

    const mine = await repository.findByUserBetween(USER_ID, '2026-01-01', '2026-12-31');
    expect(mine.every((t) => t.logicalKey !== 'z')).toBe(true);
  });
});
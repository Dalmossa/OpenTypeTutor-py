import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmProgressCardRepository } from './TypeOrmProgressCardRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440070');

const createCard = (phase: string, lessonNumber: number, date: Date, backspaceCount = 0): ProgressCard =>
  ProgressCard.create({
    userId: USER_ID,
    date,
    phase: PedagogicalPhase.create(phase),
    lessonNumber,
    insecureKeys: ['a'],
    discomfortReported: false,
    nextSessionNote: 'cartão',
    previousBackspaceCount: backspaceCount,
    currentBackspaceCount: backspaceCount,
  });

describe('TypeOrmProgressCardRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmProgressCardRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmProgressCardRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('RN27 - round-trip preserva o cartão', async () => {
    const card = createCard('ERGONOMICS_SETUP', 1, new Date('2026-01-01T00:00:00.000Z'), 4);
    await repository.save(card);

    const found = await repository.findLatestByUserId(USER_ID);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(card.id.value);
    expect(found?.phase.value).toBe('ERGONOMICS_SETUP');
    expect(found?.lessonNumber).toBe(1);
    expect(found?.insecureKeys).toEqual(['a']);
    expect(found?.currentBackspaceCount).toBe(4);
    expect(found?.nextSessionNote).toBe('cartão');
  });

  it('RN27 - findLatestByUserId retorna o cartão mais recente por data', async () => {
    const older = createCard('HOME_ROW', 1, new Date('2026-01-02T00:00:00.000Z'));
    const newer = createCard('HOME_ROW', 2, new Date('2026-01-03T00:00:00.000Z'));
    await repository.save(older);
    await repository.save(newer);

    const found = await repository.findLatestByUserId(USER_ID);
    expect(found?.phase.value).toBe('HOME_ROW');
    expect(found?.lessonNumber).toBe(2);
    expect(found?.id.value).toBe(newer.id.value);
  });

  it('findLatestByUserId retorna null para usuário sem cartão', async () => {
    const missing = await repository.findLatestByUserId(
      SessionId.create('550e8400-e29b-41d4-a716-446655440099')
    );
    expect(missing).toBeNull();
  });

  it('preserva discomfortReported e discomfortDetail', async () => {
    const card = ProgressCard.create({
      userId: USER_ID,
      date: new Date('2026-01-04T00:00:00.000Z'),
      phase: PedagogicalPhase.create('HOME_ROW'),
      lessonNumber: 3,
      insecureKeys: [],
      discomfortReported: true,
      discomfortDetail: 'Dor no pulso',
      nextSessionNote: 'pausa',
      previousBackspaceCount: 1,
      currentBackspaceCount: 2,
    });
    await repository.save(card);

    const found = await repository.findLatestByUserId(USER_ID);
    expect(found?.discomfortReported).toBe(true);
    expect(found?.discomfortDetail).toBe('Dor no pulso');
  });
});
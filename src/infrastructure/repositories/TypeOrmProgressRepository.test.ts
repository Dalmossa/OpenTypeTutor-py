import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmProgressRepository } from './TypeOrmProgressRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { Progress } from '../../domain/entities/Progress.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440060');
const LESSON_1 = SessionId.create('550e8400-e29b-41d4-a716-446655440061');
const LESSON_2 = SessionId.create('550e8400-e29b-41d4-a716-446655440062');

describe('TypeOrmProgressRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmProgressRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmProgressRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('round-trip preserva o progresso', async () => {
    const progress = Progress.create({
      userId: USER_ID,
      currentLessonId: LESSON_1,
      currentLevel: 1,
      completedLessons: 1,
      lastCompletedAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    await repository.save(progress);

    const found = await repository.findById(progress.id);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(USER_ID)).toBe(true);
    expect(found?.currentLessonId.equals(LESSON_1)).toBe(true);
    expect(found?.completedLessons).toBe(1);
    expect(found?.lastCompletedAt?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('findByUserId retorna o mesmo progresso', async () => {
    const found = await repository.findByUserId(USER_ID);
    expect(found?.completedLessons).toBe(1);
  });

  it('save atualiza o progresso do usuário sem duplicar (unique userId)', async () => {
    const current = await repository.findByUserId(USER_ID);
    if (current === null) {
      throw new Error('progresso esperado na pré-condição');
    }

    const advanced = current.completeLesson(LESSON_2);
    await repository.save(advanced);

    const found = await repository.findByUserId(USER_ID);
    expect(found?.currentLessonId.equals(LESSON_2)).toBe(true);
    expect(found?.completedLessons).toBe(2);

    const all = (await dataSource.query('SELECT id FROM progress')) as unknown as Array<{ id: string }>;
    expect(all).toHaveLength(1);
    expect(found?.id.value).toBe(all[0]?.id);
  });

  it('findByUserId retorna null para usuário sem progresso', async () => {
    const missing = await repository.findByUserId(SessionId.create('550e8400-e29b-41d4-a716-446655440099'));
    expect(missing).toBeNull();
  });
});
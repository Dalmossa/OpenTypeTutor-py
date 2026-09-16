import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmLessonRepository } from './TypeOrmLessonRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

describe('TypeOrmLessonRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmLessonRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmLessonRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const abnt2 = Layout.create('ABNT2');
  const usInternational = Layout.create('US-INTERNATIONAL');

  const createLesson = (overrides: Partial<Parameters<typeof Lesson.create>[0]> = {}) =>
    Lesson.create({
      id: SessionId.create('550e8400-e29b-41d4-a716-446655440030'),
      level: 1,
      title: 'Letras da casa',
      content: 'aaa sss ddd fff',
      targetKeys: ['a', 's', 'd', 'f'],
      difficulty: 'GUIDED',
      type: 'INTRODUCTION',
      layout: abnt2,
      ...overrides,
    });

  it('round-trip preserva targetKeys e demais campos', async () => {
    const lesson = createLesson();
    await repository.save(lesson);

    const found = await repository.findById(lesson.id);
    expect(found).not.toBeNull();
    expect(found?.id.equals(lesson.id)).toBe(true);
    expect(found?.title).toBe(lesson.title);
    expect(found?.targetKeys).toEqual(['a', 's', 'd', 'f']);
    expect(found?.layout.equals(lesson.layout)).toBe(true);
    expect(found?.type).toBe('INTRODUCTION');
  });

  it('findByLevelAndLayout filtra por nível e layout', async () => {
    await repository.save(createLesson());
    await repository.save(
      createLesson({
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440031'),
        level: 2,
        title: 'Nível 2',
        type: 'PRACTICE',
      })
    );
    await repository.save(
      createLesson({
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440032'),
        layout: usInternational,
        title: 'US-INTL',
      })
    );

    const level1Abnt2 = await repository.findByLevelAndLayout(1, abnt2);
    expect(level1Abnt2).toHaveLength(1);
    expect(level1Abnt2[0]?.id.value).toBe('550e8400-e29b-41d4-a716-446655440030');

    const level2Abnt2 = await repository.findByLevelAndLayout(2, abnt2);
    expect(level2Abnt2).toHaveLength(1);

    const level1Us = await repository.findByLevelAndLayout(1, usInternational);
    expect(level1Us).toHaveLength(1);
  });

  it('findByLevelAndTypeAndLayout combina nível, tipo e layout', async () => {
    const result = await repository.findByLevelAndTypeAndLayout(2, 'PRACTICE', abnt2);
    expect(result).toHaveLength(1);
    expect(result[0]?.id.value).toBe('550e8400-e29b-41d4-a716-446655440031');
  });

  it('findAll retorna todas as lições persistidas', async () => {
    const all = await repository.findAll();
    expect(all).toHaveLength(3);
  });

  it('findById retorna null para lição inexistente', async () => {
    const missing = await repository.findById(SessionId.create('550e8400-e29b-41d4-a716-446655440099'));
    expect(missing).toBeNull();
  });
});
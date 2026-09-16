import { describe, it, expect, beforeEach } from 'vitest';
import { GetLesson } from './GetLesson.js';
import { ListLessons } from './ListLessons.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { LessonNotFoundError } from '../../domain/errors/DomainError.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440001';

const createLesson = (overrides: Partial<Parameters<typeof Lesson.create>[0]> = {}) =>
  Lesson.create({
    id: SessionId.create(LESSON_ID),
    level: 1,
    title: 'Lições Básicas',
    content: 'aaa bbb ccc',
    targetKeys: ['a', 'b', 'c'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: Layout.create('ABNT2'),
    ...overrides,
  });

describe('GetLesson', () => {
  let lessonRepository: InMemoryLessonRepository;
  let getLesson: GetLesson;

  beforeEach(() => {
    lessonRepository = new InMemoryLessonRepository();
    getLesson = new GetLesson(lessonRepository);
  });

  describe('PRD §8 - Obter lição', () => {
    it('deve retornar lição existente pelo id', async () => {
      await lessonRepository.save(createLesson());

      const result = await getLesson.execute(LESSON_ID);

      expect(result.id).toBe(LESSON_ID);
      expect(result.title).toBe('Lições Básicas');
      expect(result.layout).toBe('ABNT2');
    });

    it('deve lançar LESSON_NOT_FOUND para id inexistente', async () => {
      await expect(
        getLesson.execute('550e8400-e29b-41d4-a716-446655440099')
      ).rejects.toThrow(LessonNotFoundError);
    });
  });
});

describe('ListLessons', () => {
  let lessonRepository: InMemoryLessonRepository;
  let profileRepository: InMemoryUserProfileRepository;
  let listLessons: ListLessons;

  beforeEach(async () => {
    lessonRepository = new InMemoryLessonRepository();
    profileRepository = new InMemoryUserProfileRepository();
    listLessons = new ListLessons(lessonRepository, profileRepository);

    await lessonRepository.save(
      createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), type: 'INTRODUCTION' })
    );
    await lessonRepository.save(
      createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), type: 'PRACTICE' })
    );
    await lessonRepository.save(
      createLesson({
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'),
        level: 1,
        type: 'PRACTICE',
        layout: Layout.create('US-INTERNATIONAL'),
      })
    );
    await lessonRepository.save(
      createLesson({
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440004'),
        level: 2,
        type: 'PRACTICE',
      })
    );
  });

  describe('PRD §8 - Listar lições', () => {
    it('deve listar todas as lições do layout ativo por padrão', async () => {
      await profileRepository.save(
        UserProfile.create({
          userId: SessionId.create(USER_ID),
          activeLayout: Layout.create('ABNT2'),
        })
      );

      const result = await listLessons.execute(USER_ID, {});

      expect(result).toHaveLength(3);
      expect(result.every(l => l.layout === 'ABNT2')).toBe(true);
    });

    it('deve filtrar por nível', async () => {
      const result = await listLessons.execute(USER_ID, { level: 2 });

      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe(2);
      expect(result[0]?.layout).toBe('ABNT2');
    });

    it('deve filtrar por tipo', async () => {
      const result = await listLessons.execute(USER_ID, { type: 'INTRODUCTION' });

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('INTRODUCTION');
    });

    it('deve filtrar por nível e tipo juntos', async () => {
      const result = await listLessons.execute(USER_ID, { level: 1, type: 'PRACTICE' });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('550e8400-e29b-41d4-a716-446655440002');
    });

    it('deve respeitar o layout informado explicitamente', async () => {
      const result = await listLessons.execute(USER_ID, { layout: 'US-INTERNATIONAL' });

      expect(result).toHaveLength(1);
      expect(result[0]?.layout).toBe('US-INTERNATIONAL');
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { GetReinforcementLesson } from './GetReinforcementLesson.js';
import { GetUserProgress } from './GetUserProgress.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { InMemoryNGramRepository } from '../../infrastructure/repositories/InMemoryNGramRepository.js';
import { InMemoryProgressRepository } from '../../infrastructure/repositories/InMemoryProgressRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { Progress } from '../../domain/entities/Progress.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LESSON_1 = '550e8400-e29b-41d4-a716-446655440001';
const LESSON_2 = '550e8400-e29b-41d4-a716-446655440002';

const createLesson = (overrides: Partial<Parameters<typeof Lesson.create>[0]> = {}) =>
  Lesson.create({
    id: SessionId.create(LESSON_1),
    level: 1,
    title: 'Lições Básicas',
    content: 'aaa bbb ccc',
    targetKeys: ['a', 'b', 'c'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: Layout.create('ABNT2'),
    ...overrides,
  });

describe('GetReinforcementLesson', () => {
  let profileRepository: InMemoryUserProfileRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let getReinforcementLesson: GetReinforcementLesson;

  beforeEach(async () => {
    profileRepository = new InMemoryUserProfileRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    getReinforcementLesson = new GetReinforcementLesson(
      profileRepository,
      keyPerformanceRepository,
      new InMemoryNGramRepository()
    );

    await profileRepository.save(
      UserProfile.create({
        userId: SessionId.create(USER_ID),
        activeLayout: Layout.create('ABNT2'),
        currentLevel: 2,
      })
    );

    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(USER_ID),
        logicalKey: 'a',
        layout: Layout.create('ABNT2'),
        attempts: 10,
        errors: 4,
        masteryState: 'WEAK',
      })
    );
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(USER_ID),
        logicalKey: 's',
        layout: Layout.create('ABNT2'),
        attempts: 10,
        errors: 1,
        masteryState: 'CONSOLIDATING',
      })
    );
  });

  describe('PRD §24 - Lição de reforço adaptativa', () => {
    it('deve gerar lição de reforço com teclas fracas do layout ativo', async () => {
      const lesson = await getReinforcementLesson.execute(USER_ID);

      expect(lesson.type).toBe('REINFORCEMENT');
      expect(lesson.difficulty).toBe('REINFORCEMENT');
      expect(lesson.layout).toBe('ABNT2');
      expect(lesson.targetKeys.length).toBeGreaterThan(0);
      expect(lesson.targetKeys).toContain('a');
      expect(lesson.targetKeys).toContain('s');
    });

    it('deve usar nível do perfil do usuário', async () => {
      const lesson = await getReinforcementLesson.execute(USER_ID);

      expect(lesson.level).toBe(2);
    });

    it('deve retornar título de reforço', async () => {
      const lesson = await getReinforcementLesson.execute(USER_ID);

      expect(lesson.title).toContain('Reforço');
    });

    it('deve gerar lição de reforço com fallback (home row) sem dados de desempenho', async () => {
      const emptyRepo = new InMemoryKeyPerformanceRepository();
      const useCase = new GetReinforcementLesson(
        profileRepository,
        emptyRepo,
        new InMemoryNGramRepository()
      );

      const lesson = await useCase.execute(USER_ID);

      expect(lesson.type).toBe('REINFORCEMENT');
      expect(lesson.difficulty).toBe('REINFORCEMENT');
      expect(lesson.layout).toBe('ABNT2');
      expect(lesson.targetKeys).toEqual(expect.arrayContaining(['f', 'j', 'd', 'k', 's', 'a', 'l', ';']));
      expect(lesson.content.length).toBeGreaterThan(0);
    });
  });
});

describe('GetUserProgress', () => {
  let progressRepository: InMemoryProgressRepository;
  let lessonRepository: InMemoryLessonRepository;
  let getUserProgress: GetUserProgress;

  beforeEach(async () => {
    progressRepository = new InMemoryProgressRepository();
    lessonRepository = new InMemoryLessonRepository();
    getUserProgress = new GetUserProgress(progressRepository, lessonRepository);

    await lessonRepository.save(createLesson());
    await lessonRepository.save(createLesson({ id: SessionId.create(LESSON_2), type: 'INTRODUCTION', targetKeys: ['d', 'e', 'f'] }));
  });

  describe('PRD §22 - Progresso do usuário', () => {
    it('deve retornar progresso padrão para usuário sem dados', async () => {
      const result = await getUserProgress.execute(USER_ID);

      expect(result.currentLevel).toBe(1);
      expect(result.completedLessons).toBe(0);
      expect(result.currentLesson).toBeNull();
      expect(result.levelCompletionRate).toBe(0);
    });

    it('deve retornar progresso persistido com próxima lição sugerida', async () => {
      await progressRepository.save(
        Progress.create({
          userId: SessionId.create(USER_ID),
          currentLessonId: SessionId.create(LESSON_1),
          currentLevel: 1,
          completedLessons: 1,
          lastCompletedAt: new Date('2024-01-01T00:00:00.000Z'),
        })
      );

      const result = await getUserProgress.execute(USER_ID);

      expect(result.currentLevel).toBe(1);
      expect(result.completedLessons).toBe(1);
      expect(result.lastCompletedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.currentLesson?.id).toBe(LESSON_2);
      expect(result.levelCompletionRate).toBeCloseTo(0.5, 5);
    });
  });
});
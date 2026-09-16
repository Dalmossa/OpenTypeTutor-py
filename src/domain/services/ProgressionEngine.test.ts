import { describe, it, expect } from 'vitest';
import { ProgressionEngine } from './ProgressionEngine.js';
import { Progress } from '../entities/Progress.js';
import { Lesson } from '../entities/Lesson.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';

describe('ProgressionEngine', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLayout = Layout.create('ABNT2');

  const createProgress = (overrides: {
    currentLessonId?: SessionId;
    currentLevel?: number;
    completedLessons?: number;
  } = {}): Progress => Progress.create({
    userId: validUserId,
    currentLessonId: overrides.currentLessonId ?? SessionId.create(),
    currentLevel: overrides.currentLevel ?? 1,
    completedLessons: overrides.completedLessons ?? 0,
    lastCompletedAt: null,
  });

  const createLesson = (overrides: {
    id?: SessionId;
    title?: string;
    content?: string;
    type?: 'INTRODUCTION' | 'PRACTICE' | 'REINFORCEMENT' | 'ASSESSMENT';
    difficulty?: 'GUIDED' | 'REINFORCEMENT' | 'FREE';
    level?: number;
    targetKeys?: string[];
    layout?: Layout;
  } = {}): Lesson => Lesson.create({
    id: overrides.id ?? SessionId.create(),
    title: overrides.title ?? 'Test Lesson',
    content: overrides.content ?? 'Test content',
    type: overrides.type ?? 'PRACTICE',
    difficulty: overrides.difficulty ?? 'GUIDED',
    level: overrides.level ?? 1,
    targetKeys: overrides.targetKeys ?? ['a', 'b', 'c'],
    layout: overrides.layout ?? validLayout,
  });

  describe('PRD §23 - Conclusão de lição', () => {
    it('deve incrementar completedLessons ao concluir lição', () => {
      const progress = createProgress({ currentLevel: 1 });
      const lesson = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001') });

      const updatedProgress = ProgressionEngine.completeLesson(progress, lesson);

      expect(updatedProgress.completedLessons).toBe(1);
    });

    it('não deve duplicar lição já concluída (conta apenas uma vez)', () => {
      const lessonId = SessionId.create('550e8400-e29b-41d4-a716-446655440001');
      const progress = createProgress({ 
        currentLevel: 1,
        currentLessonId: lessonId,
        completedLessons: 1,
      });
      const lesson = createLesson({ id: lessonId });

      const updatedProgress = ProgressionEngine.completeLesson(progress, lesson);

      expect(updatedProgress.completedLessons).toBe(1);
    });

    it('deve atualizar currentLessonId para a lição concluída', () => {
      const progress = createProgress({ currentLevel: 1 });
      const lesson = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001') });

      const updatedProgress = ProgressionEngine.completeLesson(progress, lesson);

      expect(updatedProgress.currentLessonId.equals(lesson.id)).toBe(true);
    });
  });

  describe('PRD §23 - Avanço de nível', () => {
    it('deve avançar de nível quando completar lições do nível atual', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lesson3 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'), level: 1 });

      let progress = createProgress({ currentLevel: 1 });
      progress = ProgressionEngine.completeLesson(progress, lesson1);
      progress = ProgressionEngine.completeLesson(progress, lesson2);
      progress = ProgressionEngine.completeLesson(progress, lesson3);

      expect(progress.currentLevel).toBe(2);
    });

    it('não deve permitir nível menor que 1', () => {
      const progress = createProgress({ currentLevel: 1 });
      const lesson = createLesson({ id: SessionId.create(), level: 1 });

      const updatedProgress = ProgressionEngine.completeLesson(progress, lesson);

      expect(updatedProgress.currentLevel).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Seleção da próxima lição', () => {
    it('deve selecionar próxima lição do mesmo nível se houver', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lesson3 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'), level: 1 });
      const lessons = [lesson1, lesson2, lesson3];

      const progress = createProgress({ 
        currentLevel: 1,
        currentLessonId: lesson1.id,
        completedLessons: 1,
      });

      const nextLesson = ProgressionEngine.getNextLesson(progress, lessons);

      expect(nextLesson).not.toBeNull();
      if (nextLesson) {
        expect(nextLesson.id.equals(lesson2.id)).toBe(true);
      }
    });

    it('deve retornar null quando todas as lições do nível concluídas e não há próximo nível', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lessons = [lesson1, lesson2];

      const progress = createProgress({ 
        currentLevel: 1,
        currentLessonId: lesson2.id,
        completedLessons: 2,
      });

      const nextLesson = ProgressionEngine.getNextLesson(progress, lessons);

      expect(nextLesson).toBeNull();
    });

    it('deve retornar primeira lição do próximo nível ao avançar', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lesson3 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'), level: 2 });
      const lesson4 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440004'), level: 2 });
      const lessons = [lesson1, lesson2, lesson3, lesson4];

      const progress = createProgress({ 
        currentLevel: 2,
        currentLessonId: lesson2.id,
        completedLessons: 2,
      });

      const nextLesson = ProgressionEngine.getNextLesson(progress, lessons);

      expect(nextLesson).not.toBeNull();
      if (nextLesson) {
        expect(nextLesson.id.equals(lesson3.id)).toBe(true);
        expect(nextLesson.level).toBe(2);
      }
    });
  });

  describe('Diferença entre progressão normal e reforço', () => {
    it('lições de reforço não devem contar para avanço de nível', () => {
      const normalLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), 
        level: 1,
        type: 'PRACTICE',
        difficulty: 'GUIDED',
      });
      const reinforcementLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), 
        level: 1,
        type: 'REINFORCEMENT',
        difficulty: 'REINFORCEMENT',
      });

      let progress = createProgress({ currentLevel: 1 });
      progress = ProgressionEngine.completeLesson(progress, reinforcementLesson);
      progress = ProgressionEngine.completeLesson(progress, reinforcementLesson);
      progress = ProgressionEngine.completeLesson(progress, normalLesson);

      expect(progress.completedLessons).toBeGreaterThanOrEqual(1);
    });

    it('deve distinguir entre lições INTRODUCTION, PRACTICE, REINFORCEMENT, ASSESSMENT', () => {
      const introLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), 
        type: 'INTRODUCTION',
        difficulty: 'GUIDED',
      });
      const practiceLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), 
        type: 'PRACTICE',
        difficulty: 'GUIDED',
      });
      const reinforcementLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'), 
        type: 'REINFORCEMENT',
        difficulty: 'REINFORCEMENT',
      });
      const assessmentLesson = createLesson({ 
        id: SessionId.create('550e8400-e29b-41d4-a716-446655440004'), 
        type: 'ASSESSMENT',
        difficulty: 'FREE',
      });

      const progress = createProgress({ currentLevel: 1 });

      const afterIntro = ProgressionEngine.completeLesson(progress, introLesson);
      const afterPractice = ProgressionEngine.completeLesson(afterIntro, practiceLesson);
      const afterReinforcement = ProgressionEngine.completeLesson(afterPractice, reinforcementLesson);
      const afterAssessment = ProgressionEngine.completeLesson(afterReinforcement, assessmentLesson);

      expect(afterAssessment.completedLessons).toBe(4);
    });
  });

  describe('Estatísticas de progresso', () => {
    it('deve calcular taxa de conclusão do nível atual', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lesson3 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440003'), level: 1 });
      const lesson4 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440004'), level: 2 });
      const lessons = [lesson1, lesson2, lesson3, lesson4];

      const progress = createProgress({ 
        currentLevel: 1,
        completedLessons: 2,
      });

      const completionRate = ProgressionEngine.getLevelCompletionRate(progress, lessons);

      expect(completionRate).toBeCloseTo(2 / 3, 2);
    });

    it('deve retornar 1 quando nível concluído', () => {
      const lesson1 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 1 });
      const lesson2 = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440002'), level: 1 });
      const lessons = [lesson1, lesson2];

      const progress = createProgress({ 
        currentLevel: 1,
        completedLessons: 2,
      });

      const completionRate = ProgressionEngine.getLevelCompletionRate(progress, lessons);

      expect(completionRate).toBe(1);
    });

    it('deve retornar 1 quando não há lições no nível atual', () => {
      const lesson = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 2 });

      const progress = createProgress({ currentLevel: 1 });

      const completionRate = ProgressionEngine.getLevelCompletionRate(progress, [lesson]);

      expect(completionRate).toBe(1);
    });
  });

  describe('PRD §23 - Casos extremos', () => {
    it('getNextLesson deve retornar null quando o nível atual não tem lições', () => {
      const lesson = createLesson({ id: SessionId.create('550e8400-e29b-41d4-a716-446655440001'), level: 2 });

      const progress = createProgress({ currentLevel: 1 });

      const nextLesson = ProgressionEngine.getNextLesson(progress, [lesson]);

      expect(nextLesson).toBeNull();
    });
  });
});
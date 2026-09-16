import { describe, it, expect } from 'vitest';
import { Progress } from './Progress.js';
import { SessionId } from '../value-objects/SessionId.js';

describe('Progress', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLessonId = SessionId.create('550e8400-e29b-41d4-a716-446655440001');

  describe('PRD §22 - Progress entity', () => {
    it('PRD §22 - deve criar Progress com campos obrigatórios', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      expect(progress.userId).toBe(validUserId);
      expect(progress.currentLessonId).toBe(validLessonId);
      expect(progress.currentLevel).toBe(1);
      expect(progress.completedLessons).toBe(0);
      expect(progress.lastCompletedAt).toBeNull();
    });

    it('PRD §22 - deve gerar ID automaticamente se não fornecido', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      expect(progress.id).toBeDefined();
    });
  });

  describe('PRD §22 - Conclusão de lição', () => {
    it('PRD §22 - deve incrementar completedLessons ao concluir lição', () => {
      let progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      progress = progress.completeLesson(validLessonId);

      expect(progress.completedLessons).toBe(1);
      expect(progress.lastCompletedAt).toBeInstanceOf(Date);
    });

    it('PRD §22 - deve atualizar currentLessonId ao concluir lição', () => {
      let progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      const nextLessonId = SessionId.create();
      progress = progress.completeLesson(nextLessonId);

      expect(progress.currentLessonId).toBe(nextLessonId);
    });
  });

  describe('PRD §22 - Avanço de nível', () => {
    it('PRD §22 - deve permitir avançar de nível', () => {
      let progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 5,
        lastCompletedAt: null,
      });

      progress = progress.advanceLevel();

      expect(progress.currentLevel).toBe(2);
    });
  });

  describe('PRD §22 - Validação', () => {
    it('PRD §22 - deve lançar erro para userId inválido', () => {
      expect(() =>
        Progress.create({
          userId: 'invalid' as unknown as SessionId,
          currentLessonId: validLessonId,
          currentLevel: 1,
          completedLessons: 0,
          lastCompletedAt: null,
        })
      ).toThrow();
    });

    it('PRD §22 - deve lançar erro para lessonId inválido', () => {
      expect(() =>
        Progress.create({
          userId: validUserId,
          currentLessonId: 'invalid' as unknown as SessionId,
          currentLevel: 1,
          completedLessons: 0,
          lastCompletedAt: null,
        })
      ).toThrow();
    });

    it('PRD §22 - deve lançar erro para nível menor que 1', () => {
      expect(() =>
        Progress.create({
          userId: validUserId,
          currentLessonId: validLessonId,
          currentLevel: 0,
          completedLessons: 0,
          lastCompletedAt: null,
        })
      ).toThrow('Nível deve ser maior ou igual a 1');
    });

    it('PRD §22 - deve lançar erro para completedLessons negativo', () => {
      expect(() =>
        Progress.create({
          userId: validUserId,
          currentLessonId: validLessonId,
          currentLevel: 1,
          completedLessons: -1,
          lastCompletedAt: null,
        })
      ).toThrow('Completed lessons não pode ser negativo');
    });
  });

  describe('PRD §22 - Igualdade', () => {
    it('PRD §22 - Progress com mesmo userId devem ser iguais', () => {
      const progress1 = Progress.create({ userId: validUserId, currentLessonId: validLessonId, currentLevel: 1, completedLessons: 0, lastCompletedAt: null });
      const progress2 = Progress.create({ userId: validUserId, currentLessonId: validLessonId, currentLevel: 2, completedLessons: 10, lastCompletedAt: new Date() });

      expect(progress1.equals(progress2)).toBe(true);
    });

    it('PRD §22 - Progress com userIds diferentes não devem ser iguais', () => {
      const progress1 = Progress.create({ userId: validUserId, currentLessonId: validLessonId, currentLevel: 1, completedLessons: 0, lastCompletedAt: null });
      const progress2 = Progress.create({ userId: SessionId.create(), currentLessonId: validLessonId, currentLevel: 1, completedLessons: 0, lastCompletedAt: null });

      expect(progress1.equals(progress2)).toBe(false);
    });
  });

  describe('PRD §22 - Serialização', () => {
    it('PRD §22 - toDTO deve retornar dados corretos', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 3,
        completedLessons: 10,
        lastCompletedAt: new Date('2024-01-15T10:00:00Z'),
      });

      const dto = progress.toDTO();

      expect(dto.userId).toBe(validUserId.value);
      expect(dto.currentLessonId).toBe(validLessonId.value);
      expect(dto.currentLevel).toBe(3);
      expect(dto.completedLessons).toBe(10);
      expect(dto.lastCompletedAt).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('PRD §22 - Validação e serialização (complementar)', () => {
    it('completeLesson deve rejeitar nextLessonId inválido', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      expect(() => progress.completeLesson('invalid' as unknown as SessionId)).toThrow('nextLessonId inválido');
    });

    it('setLevel deve rejeitar nível menor que 1', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      expect(() => progress.setLevel(0)).toThrow('Nível deve ser maior ou igual a 1');
    });

    it('toJSON deve delegar para toDTO', () => {
      const progress = Progress.create({
        userId: validUserId,
        currentLessonId: validLessonId,
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
      });

      const json = progress.toJSON();

      expect(json.userId).toBe(validUserId.value);
      expect(json.currentLevel).toBe(1);
    });
  });
});
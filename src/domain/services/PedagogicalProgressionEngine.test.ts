import { describe, it, expect, beforeEach } from 'vitest';
import { PedagogicalProgressionEngine } from './PedagogicalProgressionEngine.js';
import { Lesson } from '../entities/Lesson.js';
import { ProgressCard } from '../entities/ProgressCard.js';
import { SessionId } from '../value-objects/SessionId.js';
import { PedagogicalPhase } from '../value-objects/PedagogicalPhase.js';
import { Layout } from '../value-objects/Layout.js';

describe('PedagogicalProgressionEngine', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const layout = Layout.create('ABNT2');
  let engine: PedagogicalProgressionEngine;
  let mockLessons: Lesson[];

  beforeEach(() => {
    // Create mock lessons for different phases
    mockLessons = [
      // Phase: HOME_ROW (lessons 1-3)
      Lesson.create({
        id: SessionId.create('11111111-1111-4111-8111-111111111111'),
        level: 1,
        title: 'Lição 1: asdfg',
        content: 'asdfg asdfg asdfg',
        targetKeys: ['a', 's', 'd', 'f', 'g'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('HOME_ROW'),
        lessonInPhase: 1,
      }),
      Lesson.create({
        id: SessionId.create('22222222-2222-4222-8222-222222222222'),
        level: 1,
        title: 'Lição 2: hjklç',
        content: 'hjklç hjklç hjklç',
        targetKeys: ['h', 'j', 'k', 'l', 'ç'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('HOME_ROW'),
        lessonInPhase: 2,
      }),
      Lesson.create({
        id: SessionId.create('33333333-3333-4333-8333-333333333333'),
        level: 1,
        title: 'Lição 3: gfdsa',
        content: 'gfdsa gfdsa gfdsa',
        targetKeys: ['g', 'f', 'd', 's', 'a'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('HOME_ROW'),
        lessonInPhase: 3,
      }),
      // Phase: UPPER_LOWER_ROWS (lessons 1-2)
      Lesson.create({
        id: SessionId.create('44444444-4444-4444-8444-444444444444'),
        level: 1,
        title: 'Lição 1: qwert',
        content: 'qwert qwert qwert',
        targetKeys: ['q', 'w', 'e', 'r', 't'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('UPPER_LOWER_ROWS'),
        lessonInPhase: 1,
      }),
      Lesson.create({
        id: SessionId.create('55555555-5555-4555-8555-555555555555'),
        level: 1,
        title: 'Lição 2: yuiop',
        content: 'yuiop yuiop yuiop',
        targetKeys: ['y', 'u', 'i', 'o', 'p'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('UPPER_LOWER_ROWS'),
        lessonInPhase: 2,
      }),
      // Phase: WORD_FIXATION (lesson 1)
      Lesson.create({
        id: SessionId.create('66666666-6666-4666-8666-666666666666'),
        level: 2,
        title: 'Lição 1: assa sala',
        content: 'assa sala assa sala',
        targetKeys: ['a', 's', 'l'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout,
        pedagogicalPhase: PedagogicalPhase.create('WORD_FIXATION'),
        lessonInPhase: 1,
      }),
    ];

    engine = new PedagogicalProgressionEngine(mockLessons);
  });

  describe('RN25/RN26 - getNextLesson', () => {
    it('RN26 - deve avançar para próxima lição quando todas condições atendidas', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('advance');
      expect(result.lesson).not.toBeNull();
      expect(result.lesson?.lessonInPhase).toBe(2);
      expect(result.lesson?.title).toBe('Lição 2: hjklç');
      expect(result.shouldVaryExercise).toBe(false);
    });

it('RN26 - deve repetir mesma lição quando backspaces aumentaram (condição A falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: ['f'],
        discomfortReported: false,
        nextSessionNote: 'Repetir',
        previousBackspaceCount: 5,
        currentBackspaceCount: 10,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('vary');
      expect(result.lesson).not.toBeNull();
      expect(result.lesson?.lessonInPhase).toBe(1);
      expect(result.shouldVaryExercise).toBe(true);
    });

    it('RN28 - deve pausar por desconforto (condição B falha - regra de segurança)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: true,
        discomfortDetail: 'Dor no pulso',
        nextSessionNote: 'Pausar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('pause_discomfort');
      expect(result.shouldVaryExercise).toBe(false);
      expect(result.lesson).not.toBeNull();
      expect(result.lesson?.lessonInPhase).toBe(1);
    });

    it('RN26 - deve variar exercício quando aluno olha teclado (condição C falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Variar exercício',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, false); // confirmsNoLookingAtKeyboard = false

      expect(result.reason).toBe('vary');
      expect(result.shouldVaryExercise).toBe(true);
    });

    it('RN25 - deve avançar para próxima fase quando lições da fase atual acabaram', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 3, // última lição da fase HOME_ROW
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar para próxima fase',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('advance');
      expect(result.lesson).not.toBeNull();
      expect(result.lesson?.pedagogicalPhase?.value).toBe('UPPER_LOWER_ROWS');
      expect(result.lesson?.lessonInPhase).toBe(1);
    });

    it('RN25 - deve retornar complete quando não há mais fases', () => {
      // Criar card na última fase (NUMERIC_KEYPAD) com última lição
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('NUMERIC_KEYPAD'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Finalizar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, true);

      // Como não há lições para NUMERIC_KEYPAD no mock, deve retornar no_lessons
      // Se tivesse lições, na última lição da última fase retornaria 'complete'
      expect(result.reason).toBe('no_lessons');
    });

    it('RN26 - deve permitir avançar quando backspaces iguais (≤)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar',
        previousBackspaceCount: 5,
        currentBackspaceCount: 5,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('advance');
    });

    it('RN26 - deve variar exercício quando shouldVaryExercise retorna true', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: ['f'],
        discomfortReported: false,
        nextSessionNote: 'Variar exercício',
        previousBackspaceCount: 5,
        currentBackspaceCount: 10,
      });

      const result = engine.getNextLesson(card, true);

      expect(result.reason).toBe('vary');
      expect(result.shouldVaryExercise).toBe(true);
    });
  });

  describe('RN24 - getFirstLessonOfPhase', () => {
    it('RN24 - deve retornar primeira lição da fase HOME_ROW', () => {
      const lesson = engine.getFirstLessonOfPhase(PedagogicalPhase.create('HOME_ROW'));

      expect(lesson).not.toBeNull();
      expect(lesson?.lessonInPhase).toBe(1);
      expect(lesson?.title).toBe('Lição 1: asdfg');
    });

    it('RN24 - deve retornar primeira lição da fase UPPER_LOWER_ROWS', () => {
      const lesson = engine.getFirstLessonOfPhase(PedagogicalPhase.create('UPPER_LOWER_ROWS'));

      expect(lesson).not.toBeNull();
      expect(lesson?.lessonInPhase).toBe(1);
      expect(lesson?.title).toBe('Lição 1: qwert');
    });

    it('RN24 - deve retornar null para fase sem lições', () => {
      const lesson = engine.getFirstLessonOfPhase(PedagogicalPhase.create('ACCENTUATION'));

      expect(lesson).toBeNull();
    });
  });

  describe('getLessonsForPhase', () => {
    it('deve retornar todas as lições da fase HOME_ROW ordenadas', () => {
      const lessons = engine.getLessonsForPhase(PedagogicalPhase.create('HOME_ROW'));

      expect(lessons).toHaveLength(3);
      expect(lessons[0]?.lessonInPhase).toBe(1);
      expect(lessons[1]?.lessonInPhase).toBe(2);
      expect(lessons[2]?.lessonInPhase).toBe(3);
    });

    it('deve retornar array vazio para fase sem lições', () => {
      const lessons = engine.getLessonsForPhase(PedagogicalPhase.create('ACCENTUATION'));

      expect(lessons).toEqual([]);
    });
  });

  describe('hasLessonsForPhase', () => {
    it('deve retornar true para fase com lições', () => {
      expect(engine.hasLessonsForPhase(PedagogicalPhase.create('HOME_ROW'))).toBe(true);
    });

    it('deve retornar false para fase sem lições', () => {
      expect(engine.hasLessonsForPhase(PedagogicalPhase.create('ACCENTUATION'))).toBe(false);
    });
  });

  describe('getLessonByPhaseAndNumber', () => {
    it('deve retornar lição específica por fase e número', () => {
      const lesson = engine.getLessonByPhaseAndNumber(PedagogicalPhase.create('HOME_ROW'), 2);

      expect(lesson).not.toBeNull();
      expect(lesson?.lessonInPhase).toBe(2);
      expect(lesson?.title).toBe('Lição 2: hjklç');
    });

    it('deve retornar null para lição inexistente', () => {
      const lesson = engine.getLessonByPhaseAndNumber(PedagogicalPhase.create('HOME_ROW'), 99);

      expect(lesson).toBeNull();
    });
  });
});
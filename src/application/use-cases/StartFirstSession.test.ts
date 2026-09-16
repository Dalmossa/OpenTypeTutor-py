import { describe, it, expect, beforeEach } from 'vitest';
import { StartFirstSession } from './StartFirstSession.js';
import { CheckErgonomicSafety } from './CheckErgonomicSafety.js';
import { InMemoryProgressCardRepository } from '../../infrastructure/repositories/InMemoryProgressCardRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';
import { DiscomfortSignaledError } from '../../domain/errors/DomainError.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const lessonId = (n: number): string => `3bab2b40-0000-4000-8000-${String(n).padStart(12, '0')}`;

const createLesson = (n: number, phase: string, lessonInPhase: number): Lesson =>
  Lesson.create({
    id: SessionId.create(lessonId(n)),
    level: 1,
    title: `Lição ${String(lessonInPhase)} — ${phase}`,
    content: 'asdfg jklç',
    targetKeys: ['a', 's'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: Layout.create('ABNT2'),
    pedagogicalPhase: PedagogicalPhase.create(phase),
    lessonInPhase,
  });

const OK_POSTURE = {
  seatHeightOk: true,
  lumbarSupportOk: true,
  monitorAtEyeLevel: true,
  wristSupportOk: true,
  discomfortReported: false,
};

describe('RN24 - StartFirstSession (check-in da primeira sessão)', () => {
  let cardRepository: InMemoryProgressCardRepository;
  let lessonRepository: InMemoryLessonRepository;
  let useCase: StartFirstSession;

  beforeEach(async () => {
    cardRepository = new InMemoryProgressCardRepository();
    lessonRepository = new InMemoryLessonRepository();
    useCase = new StartFirstSession(new CheckErgonomicSafety(), cardRepository, lessonRepository);

    await lessonRepository.save(createLesson(1, 'ERGONOMICS_SETUP', 1));
    await lessonRepository.save(createLesson(2, 'HOME_ROW', 1));
  });

  it('RN24 - usuário novo com postura ok → safe true, alreadyStarted false e lição 1 da fase inicial', async () => {
    const result = await useCase.execute({ userId: USER_ID, ...OK_POSTURE });

    expect(result.safe).toBe(true);
    expect(result.alreadyStarted).toBe(false);
    expect(result.progressCard).toBeNull();
    expect(result.lesson?.id).toBe(lessonId(1));
    expect(result.lesson?.pedagogicalPhase).toBe('ERGONOMICS_SETUP');
    expect(result.guidance).toContain('Primeira sessão');
  });

  it('RN24 - usuário com cartão anterior → alreadyStarted true e próxima lição', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('ERGONOMICS_SETUP'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'feito',
        previousBackspaceCount: 2,
        currentBackspaceCount: 1,
      })
    );

    const result = await useCase.execute({ userId: USER_ID, ...OK_POSTURE });

    expect(result.safe).toBe(true);
    expect(result.alreadyStarted).toBe(true);
    expect(result.progressCard?.lessonNumber).toBe(1);
    expect(result.lesson?.id).toBe(lessonId(2));
    expect(result.lesson?.pedagogicalPhase).toBe('HOME_ROW');
  });

  it('RN24 - postura inadequada → safe false e liberação negada', async () => {
    const result = await useCase.execute({
      userId: USER_ID,
      seatHeightOk: false,
      lumbarSupportOk: true,
      monitorAtEyeLevel: true,
      wristSupportOk: true,
      discomfortReported: false,
    });

    expect(result.safe).toBe(false);
    expect(result.alreadyStarted).toBe(false);
    expect(result.lesson).toBeNull();
  });

  it('RN28 - desconforto propaga DiscomfortSignaledError', async () => {
    await expect(
      useCase.execute({
        userId: USER_ID,
        seatHeightOk: true,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: true,
        discomfortDetail: 'Dor na coluna',
      })
    ).rejects.toBeInstanceOf(DiscomfortSignaledError);
  });
});
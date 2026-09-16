import { describe, it, expect, beforeEach } from 'vitest';
import { GetNextPedagogicalLesson } from './GetNextPedagogicalLesson.js';
import { InMemoryProgressCardRepository } from '../../infrastructure/repositories/InMemoryProgressCardRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const lessonId = (n: number): string => `3bab2b40-0000-4000-8000-${String(n).padStart(12, '0')}`;

const createLesson = (n: number, phase: string, lessonInPhase: number): Lesson =>
  Lesson.create({
    id: SessionId.create(lessonId(n)),
    level: 1,
    title: `Lição ${String(lessonInPhase)} — ${phase}`,
    content: 'asdfg jklç',
    targetKeys: ['a', 's', 'd', 'f'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: Layout.create('ABNT2'),
    pedagogicalPhase: PedagogicalPhase.create(phase),
    lessonInPhase,
  });

describe('RN25 - GetNextPedagogicalLesson (próxima lição pedagógica)', () => {
  let cardRepository: InMemoryProgressCardRepository;
  let lessonRepository: InMemoryLessonRepository;
  let useCase: GetNextPedagogicalLesson;

  beforeEach(async () => {
    cardRepository = new InMemoryProgressCardRepository();
    lessonRepository = new InMemoryLessonRepository();
    useCase = new GetNextPedagogicalLesson(cardRepository, lessonRepository);

    await lessonRepository.save(createLesson(1, 'ERGONOMICS_SETUP', 1));
    await lessonRepository.save(createLesson(2, 'HOME_ROW', 1));
    await lessonRepository.save(createLesson(3, 'HOME_ROW', 2));
    await lessonRepository.save(createLesson(79, 'NUMERIC_KEYPAD', 1));
    await lessonRepository.save(createLesson(80, 'NUMERIC_KEYPAD', 2));
  });

  it('RN25 - sem cartão retorna a primeira lição da fase inicial ERGONOMICS_SETUP (advance)', async () => {
    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('advance');
    expect(result.shouldVaryExercise).toBe(false);
    expect(result.lesson?.id).toBe(lessonId(1));
    expect(result.lesson?.pedagogicalPhase).toBe('ERGONOMICS_SETUP');
    expect(result.progressCard).toBeNull();
  });

  it('RN27 - retorna o último cartão de progresso do usuário', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: ['f'],
        discomfortReported: false,
        nextSessionNote: 'ok',
        previousBackspaceCount: 0,
        currentBackspaceCount: 0,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.progressCard).not.toBeNull();
    expect(result.progressCard?.phase).toBe('HOME_ROW');
    expect(result.progressCard?.lessonNumber).toBe(1);
    expect(result.progressCard?.insecureKeys).toEqual(['f']);
  });

  it('RN26 - backspaces ≤ anterior e sem desconforto → avança para a próxima lição', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('ERGONOMICS_SETUP'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'ok',
        previousBackspaceCount: 3,
        currentBackspaceCount: 2,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('advance');
    expect(result.lesson?.id).toBe(lessonId(2));
    expect(result.lesson?.pedagogicalPhase).toBe('HOME_ROW');
  });

  it('RN29 - backspaces aumentados → mesma lição com shouldVaryExercise true (vary)', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: ['a'],
        discomfortReported: false,
        nextSessionNote: 'errei mais',
        previousBackspaceCount: 0,
        currentBackspaceCount: 5,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('vary');
    expect(result.shouldVaryExercise).toBe(true);
    expect(result.lesson?.id).toBe(lessonId(2));
  });

  it('RN28 - desconforto relatado → pause_discomfort na lição atual', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: true,
        discomfortDetail: 'Dor no pulso',
        nextSessionNote: 'pausa',
        previousBackspaceCount: 0,
        currentBackspaceCount: 0,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('pause_discomfort');
    expect(result.lesson?.id).toBe(lessonId(2));
  });

  it('RN30 - currículo concluído → complete com lesson null', async () => {
    await cardRepository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('NUMERIC_KEYPAD'),
        lessonNumber: 2,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'fim',
        previousBackspaceCount: 2,
        currentBackspaceCount: 1,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('complete');
    expect(result.lesson).toBeNull();
  });

  it('sem lições no currículo → no_lessons', async () => {
    useCase = new GetNextPedagogicalLesson(cardRepository, new InMemoryLessonRepository());
    const result = await useCase.execute({
      userId: USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });

    expect(result.reason).toBe('no_lessons');
    expect(result.lesson).toBeNull();
  });
});
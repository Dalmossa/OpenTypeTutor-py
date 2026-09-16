import { describe, it, expect, beforeEach } from 'vitest';
import { SubmitProgressCard } from './SubmitProgressCard.js';
import { InMemoryProgressCardRepository } from '../../infrastructure/repositories/InMemoryProgressCardRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const lessonId = (n: number): string => `9f1d1b40-0000-4000-8000-${String(n).padStart(12, '0')}`;

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

describe('RN27 - SubmitProgressCard (persistência do cartão de progresso)', () => {
  let repository: InMemoryProgressCardRepository;
  let lessonRepository: InMemoryLessonRepository;
  let useCase: SubmitProgressCard;

  beforeEach(async () => {
    repository = new InMemoryProgressCardRepository();
    lessonRepository = new InMemoryLessonRepository();
    useCase = new SubmitProgressCard(repository, lessonRepository);

    await lessonRepository.save(createLesson(1, 'ERGONOMICS_SETUP', 1));
    await lessonRepository.save(createLesson(2, 'HOME_ROW', 1));
    await lessonRepository.save(createLesson(3, 'HOME_ROW', 2));
  });

  it('RN27 - registro sem cartão anterior → começa na fase inicial com previousBackspaceCount 0', async () => {
    const result = await useCase.execute({
      userId: USER_ID,
      insecureKeys: ['a'],
      discomfortReported: false,
      nextSessionNote: 'Lição 1 concluída',
      currentBackspaceCount: 3,
    });

    expect(result.progressCard.phase).toBe('ERGONOMICS_SETUP');
    expect(result.progressCard.lessonNumber).toBe(1);
    expect(result.progressCard.previousBackspaceCount).toBe(0);
    expect(result.progressCard.currentBackspaceCount).toBe(3);
    expect(result.progressCard.insecureKeys).toEqual(['a']);

    const saved = await repository.findLatestByUserId(SessionId.create(USER_ID));
    expect(saved?.id.value).toBe(result.progressCard.id);
  });

  it('RN26 - critério de avanço atingido novamente → cartão avança a lição (não repete)', async () => {
    const first = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'Lição 1 concluída',
      currentBackspaceCount: 0,
    });
    expect(first.progressCard.phase).toBe('ERGONOMICS_SETUP');
    expect(first.progressCard.lessonNumber).toBe(1);

    const second = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'Lição 2 concluída',
      currentBackspaceCount: 0,
    });

    expect(second.progressCard.phase).toBe('HOME_ROW');
    expect(second.progressCard.lessonNumber).toBe(1);
    expect(second.progressCard.previousBackspaceCount).toBe(0);
    expect(second.progressCard.currentBackspaceCount).toBe(0);

    const third = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'Lição 3 concluída',
      currentBackspaceCount: 0,
    });

    expect(third.progressCard.phase).toBe('HOME_ROW');
    expect(third.progressCard.lessonNumber).toBe(2);
    expect(third.progressCard.previousBackspaceCount).toBe(0);
    expect(third.progressCard.currentBackspaceCount).toBe(0);
  });

  it('RN26 - backspaces maiores que a tentativa anterior → cartão mantém a mesma lição', async () => {
    await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'tentativa boa',
      currentBackspaceCount: 0,
    });

    const result = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'tentativa ruim',
      currentBackspaceCount: 5,
    });

    expect(result.progressCard.phase).toBe('ERGONOMICS_SETUP');
    expect(result.progressCard.lessonNumber).toBe(1);
    expect(result.progressCard.previousBackspaceCount).toBe(0);
    expect(result.progressCard.currentBackspaceCount).toBe(5);
  });

  it('RN27 - registro seguinte herda previousBackspaceCount do cartão anterior', async () => {
    await repository.save(
      ProgressCard.create({
        userId: SessionId.create(USER_ID),
        date: new Date('2026-01-01T00:00:00.000Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'anterior',
        previousBackspaceCount: 2,
        currentBackspaceCount: 5,
      })
    );

    const result = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'seguinte',
      currentBackspaceCount: 4,
    });

    expect(result.progressCard.previousBackspaceCount).toBe(5);
  });

  it('RN28 - desconforto relatado fica registrado no cartão', async () => {
    const result = await useCase.execute({
      userId: USER_ID,
      insecureKeys: [],
      discomfortReported: true,
      discomfortDetail: 'Dor de cabeça',
      nextSessionNote: 'preciso pausar',
      currentBackspaceCount: 1,
    });

    expect(result.progressCard.discomfortReported).toBe(true);
    expect(result.progressCard.discomfortDetail).toBe('Dor de cabeça');
  });
});
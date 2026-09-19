import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubmitTypingSession } from './SubmitTypingSession.js';
import { InMemoryTypingSessionRepository } from '../../infrastructure/repositories/InMemoryTypingSessionRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { InMemoryProgressRepository } from '../../infrastructure/repositories/InMemoryProgressRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { InMemoryPracticePacingRepository } from '../../infrastructure/repositories/InMemoryPracticePacingRepository.js';
import { InMemoryDailyMetricsAggregateRepository } from '../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryKeyMasteryTransitionRepository } from '../../infrastructure/repositories/InMemoryKeyMasteryTransitionRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';

// TASK-081 - Paridade web vs desktop: para uma mesma sessão digitada, a UI web
// e o cliente desktop devem produzir métricas idênticas no backend.
//
// Os payloads abaixo reproduzem exatamente o array de keystrokes que cada
// cliente envia ao backend para o mesmo episódio de digitação (mesma lição,
// mesmas teclas, mesmas latências):
// - desktop: KeystrokeEvent serializado via BaseAPIModel (to_camel); compose envia
//   composed_character=null e logical_key=character composto (typing_area._make_event).
// - web: KeystrokeEventDTO gerado em use-typing-session.makeEvent; compose envia
//   composedCharacter e logicalKey=character composto (após fix TASK-081).

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';
const EPISODE_CONTENT = 'aá bcd';

type Payload = KeystrokeEventProps[];

// Desktop: corpo da lição "aá bcd", compose 'á' correto, um INCORRECT corrigido.
// TASK-081+DEAD_KEY: compose emite DEAD_KEY_COMPOSE antes do caractere final.
const desktopPayload: Payload = [
  { expectedKey: 'a', typedKey: 'a', physicalKey: 'a', logicalKey: 'a', eventType: 'CORRECT', timestampMs: 1000, latencyMs: 100, composedCharacter: null },
  { expectedKey: '', typedKey: null, physicalKey: 'Compose', logicalKey: 'Compose', eventType: 'DEAD_KEY_COMPOSE', timestampMs: 1050, latencyMs: null, composedCharacter: null },
  { expectedKey: 'á', typedKey: 'á', physicalKey: 'á', logicalKey: 'á', eventType: 'CORRECT', timestampMs: 1150, latencyMs: 100, composedCharacter: null },
  { expectedKey: ' ', typedKey: ' ', physicalKey: ' ', logicalKey: ' ', eventType: 'CORRECT', timestampMs: 1270, latencyMs: 120, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'z', physicalKey: 'z', logicalKey: 'z', eventType: 'INCORRECT', timestampMs: 1380, latencyMs: 110, composedCharacter: null },
  { expectedKey: 'b', typedKey: null, physicalKey: 'Backspace', logicalKey: 'Backspace', eventType: 'CORRECTION', timestampMs: 1470, latencyMs: 90, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'b', physicalKey: 'b', logicalKey: 'b', eventType: 'CORRECT', timestampMs: 1570, latencyMs: 100, composedCharacter: null },
  { expectedKey: 'c', typedKey: 'c', physicalKey: 'c', logicalKey: 'c', eventType: 'CORRECT', timestampMs: 1670, latencyMs: 100, composedCharacter: null },
  { expectedKey: 'd', typedKey: 'd', physicalKey: 'd', logicalKey: 'd', eventType: 'CORRECT', timestampMs: 1770, latencyMs: 100, composedCharacter: null },
];

// Web: mesmo episódio; compose difere apenas na serialização (composedCharacter preenchido).
const webPayload: Payload = [
  { expectedKey: 'a', typedKey: 'a', physicalKey: 'a', logicalKey: 'a', eventType: 'CORRECT', timestampMs: 1000, latencyMs: 100, composedCharacter: null },
  { expectedKey: '', typedKey: null, physicalKey: 'Compose', logicalKey: 'Compose', eventType: 'DEAD_KEY_COMPOSE', timestampMs: 1050, latencyMs: null, composedCharacter: null },
  { expectedKey: 'á', typedKey: 'á', physicalKey: 'á', logicalKey: 'á', eventType: 'CORRECT', timestampMs: 1150, latencyMs: 100, composedCharacter: 'á' },
  { expectedKey: ' ', typedKey: ' ', physicalKey: ' ', logicalKey: ' ', eventType: 'CORRECT', timestampMs: 1270, latencyMs: 120, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'z', physicalKey: 'z', logicalKey: 'z', eventType: 'INCORRECT', timestampMs: 1380, latencyMs: 110, composedCharacter: null },
  { expectedKey: 'b', typedKey: null, physicalKey: 'Backspace', logicalKey: 'Backspace', eventType: 'CORRECTION', timestampMs: 1470, latencyMs: 90, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'b', physicalKey: 'b', logicalKey: 'b', eventType: 'CORRECT', timestampMs: 1570, latencyMs: 100, composedCharacter: null },
  { expectedKey: 'c', typedKey: 'c', physicalKey: 'c', logicalKey: 'c', eventType: 'CORRECT', timestampMs: 1670, latencyMs: 100, composedCharacter: null },
  { expectedKey: 'd', typedKey: 'd', physicalKey: 'd', logicalKey: 'd', eventType: 'CORRECT', timestampMs: 1770, latencyMs: 100, composedCharacter: null },
];

// Episódio com compose DIFERENTE do esperado: web (pós-fix) e desktop contam
// como INCORRECT — a velha serialização web gravava 'CORRECT' incondicionalmente.
const desktopMismatchPayload: Payload = [
  { expectedKey: 'a', typedKey: 'a', physicalKey: 'a', logicalKey: 'a', eventType: 'CORRECT', timestampMs: 1000, latencyMs: 100, composedCharacter: null },
  { expectedKey: '', typedKey: null, physicalKey: 'Compose', logicalKey: 'Compose', eventType: 'DEAD_KEY_COMPOSE', timestampMs: 1050, latencyMs: null, composedCharacter: null },
  { expectedKey: 'á', typedKey: 'é', physicalKey: 'é', logicalKey: 'é', eventType: 'INCORRECT', timestampMs: 1150, latencyMs: 100, composedCharacter: null },
  { expectedKey: ' ', typedKey: ' ', physicalKey: ' ', logicalKey: ' ', eventType: 'CORRECT', timestampMs: 1270, latencyMs: 120, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'b', physicalKey: 'b', logicalKey: 'b', eventType: 'CORRECT', timestampMs: 1380, latencyMs: 110, composedCharacter: null },
  { expectedKey: 'c', typedKey: 'c', physicalKey: 'c', logicalKey: 'c', eventType: 'CORRECT', timestampMs: 1470, latencyMs: 90, composedCharacter: null },
  { expectedKey: 'd', typedKey: 'd', physicalKey: 'd', logicalKey: 'd', eventType: 'CORRECT', timestampMs: 1570, latencyMs: 100, composedCharacter: null },
];

const webMismatchPayload: Payload = [
  { expectedKey: 'a', typedKey: 'a', physicalKey: 'a', logicalKey: 'a', eventType: 'CORRECT', timestampMs: 1000, latencyMs: 100, composedCharacter: null },
  { expectedKey: '', typedKey: null, physicalKey: 'Compose', logicalKey: 'Compose', eventType: 'DEAD_KEY_COMPOSE', timestampMs: 1050, latencyMs: null, composedCharacter: null },
  { expectedKey: 'á', typedKey: 'é', physicalKey: 'é', logicalKey: 'é', eventType: 'INCORRECT', timestampMs: 1150, latencyMs: 100, composedCharacter: 'é' },
  { expectedKey: ' ', typedKey: ' ', physicalKey: ' ', logicalKey: ' ', eventType: 'CORRECT', timestampMs: 1270, latencyMs: 120, composedCharacter: null },
  { expectedKey: 'b', typedKey: 'b', physicalKey: 'b', logicalKey: 'b', eventType: 'CORRECT', timestampMs: 1380, latencyMs: 110, composedCharacter: null },
  { expectedKey: 'c', typedKey: 'c', physicalKey: 'c', logicalKey: 'c', eventType: 'CORRECT', timestampMs: 1470, latencyMs: 90, composedCharacter: null },
  { expectedKey: 'd', typedKey: 'd', physicalKey: 'd', logicalKey: 'd', eventType: 'CORRECT', timestampMs: 1570, latencyMs: 100, composedCharacter: null },
];

describe('TASK-081 - Paridade web vs desktop MÉTRICAS', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let progressRepository: InMemoryProgressRepository;
  let lessonRepository: InMemoryLessonRepository;
  let submitTypingSession: SubmitTypingSession;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    sessionRepository = new InMemoryTypingSessionRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    progressRepository = new InMemoryProgressRepository();
    lessonRepository = new InMemoryLessonRepository();

    submitTypingSession = new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      new InMemoryPracticePacingRepository(),
      new InMemoryDailyMetricsAggregateRepository(),
      new InMemoryUserProfileRepository(),
      new InMemoryKeyMasteryTransitionRepository()
    );

    await lessonRepository.save(
      Lesson.create({
        id: SessionId.create(LESSON_ID),
        level: 1,
        title: 'Lições Básicas',
        content: EPISODE_CONTENT,
        targetKeys: ['a', 'á', 'b', 'c', 'd'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout: Layout.create('ABNT2'),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function startAs(): Promise<string> {
    const session = TypingSession.create({
      userId: SessionId.create(USER_ID),
      lessonId: SessionId.create(LESSON_ID),
      layout: Layout.create('ABNT2'),
    }).start();
    await sessionRepository.save(session);
    return session.id.value;
  }

  async function submitSession(sessionId: string, keystrokes: KeystrokeEventProps[]) {
    return submitTypingSession.execute({
      userId: USER_ID,
      sessionId,
      keystrokes,
    });
  }

  it('mesma sessão (lição + teclas + latências) → métricas idênticas no backend', async () => {
    const desktopSid = await startAs();
    const webSid = await startAs();

    vi.advanceTimersByTime(5000);

    const desktop = await submitSession(desktopSid, desktopPayload);
    const web = await submitSession(webSid, webPayload);

    expect(web.state).toBe('COMPLETED');
    expect(desktop.metrics).toEqual(web.metrics);
    expect(desktop.metrics).toEqual({
      charactersTyped: 7,
      correctCharacters: 6,
      incorrectCharacters: 1,
      correctedErrors: 1,
      finalUncorrectedErrors: 0,
      accuracy: 6 / 7,
      grossWpm: 17,
      netWpm: 17,
      activeDurationMs: 5000,
      averageLatencyMs: (100 + 100 + 120 + 110 + 100 + 100 + 100) / 7,
    });
  });

  it('compose com caractere errado é INCORRECT no web (pós-fix) e no desktop', async () => {
    const desktopSid = await startAs();
    const webSid = await startAs();

    vi.advanceTimersByTime(5000);

    const desktop = await submitSession(desktopSid, desktopMismatchPayload);
    const web = await submitSession(webSid, webMismatchPayload);

    expect(web.metrics.incorrectCharacters).toBe(1);
    expect(web.metrics.correctedErrors).toBe(0);
    expect(web.metrics.finalUncorrectedErrors).toBe(1);
    expect(desktop.metrics).toEqual(web.metrics);
  });

  it('compose correto não infla acurácia no web (regressão do bug "sempre CORRECT")', async () => {
    const webSid = await startAs();
    const desktopSid = await startAs();

    vi.advanceTimersByTime(5000);

    const web = await submitSession(webSid, webPayload);
    const desktop = await submitSession(desktopSid, desktopPayload);

    expect(web.metrics.correctCharacters).toBe(desktop.metrics.correctCharacters);
    expect(web.metrics.accuracy).toBe(desktop.metrics.accuracy);
    expect(web.metrics.accuracy).toBe(6 / 7);
    expect(desktop.metrics.finalUncorrectedErrors).toBe(0);
  });

  it('latência média idêntica: CORRECTION não entra na média (igual nos dois clientes)', async () => {
    const desktopSid = await startAs();
    const webSid = await startAs();

    vi.advanceTimersByTime(5000);

    const desktop = await submitSession(desktopSid, desktopPayload);
    const web = await submitSession(webSid, webPayload);

    const expectedAvg = (100 + 100 + 120 + 110 + 100 + 100 + 100) / 7;
    expect(desktop.metrics.averageLatencyMs).toBeCloseTo(expectedAvg, 6);
    expect(web.metrics.averageLatencyMs).toBeCloseTo(expectedAvg, 6);
  });
});
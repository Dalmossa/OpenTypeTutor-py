import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SubmitTypingSession } from "./SubmitTypingSession.js";
import { InMemoryTypingSessionRepository } from "../../infrastructure/repositories/InMemoryTypingSessionRepository.js";
import { InMemoryKeyPerformanceRepository } from "../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js";
import { InMemoryProgressRepository } from "../../infrastructure/repositories/InMemoryProgressRepository.js";
import { InMemoryLessonRepository } from "../../infrastructure/repositories/InMemoryLessonRepository.js";
import { InMemoryPracticePacingRepository } from "../../infrastructure/repositories/InMemoryPracticePacingRepository.js";
import { InMemoryDailyMetricsAggregateRepository } from "../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js";
import { InMemoryUserProfileRepository } from "../../infrastructure/repositories/InMemoryUserProfileRepository.js";
import { InMemoryKeyMasteryTransitionRepository } from "../../infrastructure/repositories/InMemoryKeyMasteryTransitionRepository.js";
import { Lesson } from "../../domain/entities/Lesson.js";
import { TypingSession } from "../../domain/entities/TypingSession.js";
import type { AdminSettings } from "../../domain/entities/AdminSettings.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";
import type { KeystrokeEventProps } from "../../domain/entities/KeystrokeEvent.js";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";

// Fake in-memory admin settings repository for tests
class InMemoryAdminSettingsRepository implements IAdminSettingsRepository {
  private stored: AdminSettings | null = null;

  async find(): Promise<AdminSettings | null> {
    await Promise.resolve();
    return this.stored;
  }

  async save(settings: AdminSettings): Promise<void> {
    await Promise.resolve();
    this.stored = settings;
  }

  set(settings: AdminSettings | null): void {
    this.stored = settings;
  }
}

// TASK-081 - Regressões de composição (dead key) do cliente web, preservadas após
// a remoção do cliente desktop (ADR-022): para um mesmo episódio digitado no web,
// o backend deve aferir compose correto como CORRECT, compose errado como INCORRECT
// (bug "sempre CORRECT" do handleCompositionEnd) e CORRECTION fora da média de latência.
//
// Payload: KeystrokeEventDTO gerado em use-typing-session.makeEvent; compose envia
// DEAD_KEY_COMPOSE na entrada e composedCharacter + logicalKey=caractere composto
// no evento final (após fix TASK-081).

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LESSON_ID = "550e8400-e29b-41d4-a716-446655440010";
const EPISODE_CONTENT = "aá bcd";

type Payload = KeystrokeEventProps[];

// Web: corpo da lição "aá bcd", compose 'á' correto, um INCORRECT corrigido.
const composeCorrectPayload: Payload = [
  {
    expectedKey: "a",
    typedKey: "a",
    physicalKey: "a",
    logicalKey: "a",
    eventType: "CORRECT",
    timestampMs: 1000,
    latencyMs: 100,
    composedCharacter: null,
  },
  {
    expectedKey: "",
    typedKey: null,
    physicalKey: "Compose",
    logicalKey: "Compose",
    eventType: "DEAD_KEY_COMPOSE",
    timestampMs: 1050,
    latencyMs: null,
    composedCharacter: null,
  },
  {
    expectedKey: "á",
    typedKey: "á",
    physicalKey: "á",
    logicalKey: "á",
    eventType: "CORRECT",
    timestampMs: 1150,
    latencyMs: 100,
    composedCharacter: "á",
  },
  {
    expectedKey: " ",
    typedKey: " ",
    physicalKey: " ",
    logicalKey: " ",
    eventType: "CORRECT",
    timestampMs: 1270,
    latencyMs: 120,
    composedCharacter: null,
  },
  {
    expectedKey: "b",
    typedKey: "z",
    physicalKey: "z",
    logicalKey: "z",
    eventType: "INCORRECT",
    timestampMs: 1380,
    latencyMs: 110,
    composedCharacter: null,
  },
  {
    expectedKey: "b",
    typedKey: null,
    physicalKey: "Backspace",
    logicalKey: "Backspace",
    eventType: "CORRECTION",
    timestampMs: 1470,
    latencyMs: 90,
    composedCharacter: null,
  },
  {
    expectedKey: "b",
    typedKey: "b",
    physicalKey: "b",
    logicalKey: "b",
    eventType: "CORRECT",
    timestampMs: 1570,
    latencyMs: 100,
    composedCharacter: null,
  },
  {
    expectedKey: "c",
    typedKey: "c",
    physicalKey: "c",
    logicalKey: "c",
    eventType: "CORRECT",
    timestampMs: 1670,
    latencyMs: 100,
    composedCharacter: null,
  },
  {
    expectedKey: "d",
    typedKey: "d",
    physicalKey: "d",
    logicalKey: "d",
    eventType: "CORRECT",
    timestampMs: 1770,
    latencyMs: 100,
    composedCharacter: null,
  },
];

// Episódio com compose DIFERENTE do esperado: conta como INCORRECT (a velha
// serialização web gravava 'CORRECT' incondicionalmente).
const composeMismatchPayload: Payload = [
  {
    expectedKey: "a",
    typedKey: "a",
    physicalKey: "a",
    logicalKey: "a",
    eventType: "CORRECT",
    timestampMs: 1000,
    latencyMs: 100,
    composedCharacter: null,
  },
  {
    expectedKey: "",
    typedKey: null,
    physicalKey: "Compose",
    logicalKey: "Compose",
    eventType: "DEAD_KEY_COMPOSE",
    timestampMs: 1050,
    latencyMs: null,
    composedCharacter: null,
  },
  {
    expectedKey: "á",
    typedKey: "é",
    physicalKey: "é",
    logicalKey: "é",
    eventType: "INCORRECT",
    timestampMs: 1150,
    latencyMs: 100,
    composedCharacter: "é",
  },
  {
    expectedKey: " ",
    typedKey: " ",
    physicalKey: " ",
    logicalKey: " ",
    eventType: "CORRECT",
    timestampMs: 1270,
    latencyMs: 120,
    composedCharacter: null,
  },
  {
    expectedKey: "b",
    typedKey: "b",
    physicalKey: "b",
    logicalKey: "b",
    eventType: "CORRECT",
    timestampMs: 1380,
    latencyMs: 110,
    composedCharacter: null,
  },
  {
    expectedKey: "c",
    typedKey: "c",
    physicalKey: "c",
    logicalKey: "c",
    eventType: "CORRECT",
    timestampMs: 1470,
    latencyMs: 90,
    composedCharacter: null,
  },
  {
    expectedKey: "d",
    typedKey: "d",
    physicalKey: "d",
    logicalKey: "d",
    eventType: "CORRECT",
    timestampMs: 1570,
    latencyMs: 100,
    composedCharacter: null,
  },
];

describe("TASK-081 - Regressões de composição do cliente web", () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let progressRepository: InMemoryProgressRepository;
  let lessonRepository: InMemoryLessonRepository;
  let submitTypingSession: SubmitTypingSession;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    sessionRepository = new InMemoryTypingSessionRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    progressRepository = new InMemoryProgressRepository();
    lessonRepository = new InMemoryLessonRepository();
    const adminSettingsRepository = new InMemoryAdminSettingsRepository();

    submitTypingSession = new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      new InMemoryPracticePacingRepository(),
      new InMemoryDailyMetricsAggregateRepository(),
      new InMemoryUserProfileRepository(),
      new InMemoryKeyMasteryTransitionRepository(),
      adminSettingsRepository,
    );

    await lessonRepository.save(
      Lesson.create({
        id: SessionId.create(LESSON_ID),
        level: 1,
        title: "Lições Básicas",
        content: EPISODE_CONTENT,
        targetKeys: ["a", "á", "b", "c", "d"],
        difficulty: "GUIDED",
        type: "PRACTICE",
        layout: Layout.create("ABNT2"),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function startAs(): Promise<string> {
    const session = TypingSession.create({
      userId: SessionId.create(USER_ID),
      lessonId: SessionId.create(LESSON_ID),
      layout: Layout.create("ABNT2"),
    }).start();
    await sessionRepository.save(session);
    return session.id.value;
  }

  async function submitSession(
    sessionId: string,
    keystrokes: KeystrokeEventProps[],
  ) {
    return submitTypingSession.execute({
      userId: USER_ID,
      sessionId,
      keystrokes,
    });
  }

  it('compose com caractere errado é INCORRECT (regressão do bug "sempre CORRECT")', async () => {
    const sessionId = await startAs();

    vi.advanceTimersByTime(5000);

    const result = await submitSession(sessionId, composeMismatchPayload);

    expect(result.state).toBe("COMPLETED");
    expect(result.metrics.incorrectCharacters).toBe(1);
    expect(result.metrics.correctedErrors).toBe(0);
    expect(result.metrics.finalUncorrectedErrors).toBe(1);
  });

  it("compose correto não infla precisão", async () => {
    const sessionId = await startAs();

    vi.advanceTimersByTime(5000);

    const result = await submitSession(sessionId, composeCorrectPayload);

    expect(result.metrics.correctCharacters).toBe(6);
    expect(result.metrics.incorrectCharacters).toBe(1);
    expect(result.metrics.accuracy).toBe(6 / 7);
    expect(result.metrics.finalUncorrectedErrors).toBe(0);
  });

  it("latência média: DEAD_KEY_COMPOSE e CORRECTION não entram na média", async () => {
    const sessionId = await startAs();

    vi.advanceTimersByTime(5000);

    const result = await submitSession(sessionId, composeCorrectPayload);

    const expectedAvg = (100 + 100 + 120 + 110 + 100 + 100 + 100) / 7;
    expect(result.metrics.averageLatencyMs).toBeCloseTo(expectedAvg, 6);
    expect(result.metrics.activeDurationMs).toBe(5000);
  });
});

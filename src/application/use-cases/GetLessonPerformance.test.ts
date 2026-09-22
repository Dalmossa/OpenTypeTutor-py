import { describe, it, expect, beforeEach } from "vitest";

import { TypingSession } from "../../domain/entities/TypingSession.js";
import { SessionMetrics } from "../../domain/entities/SessionMetrics.js";
import { Layout } from "../../domain/value-objects/Layout.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { InMemoryTypingSessionRepository } from "../../infrastructure/repositories/InMemoryTypingSessionRepository.js";
import { GetLessonPerformance } from "./GetLessonPerformance.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440001";
const LESSON_A = "550e8400-e29b-41d4-a716-446655440010";
const LESSON_B = "550e8400-e29b-41d4-a716-446655440011";

describe("RN32 - GetLessonPerformance (status por lição)", () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let getLessonPerformance: GetLessonPerformance;

  beforeEach(() => {
    sessionRepository = new InMemoryTypingSessionRepository();
    getLessonPerformance = new GetLessonPerformance(sessionRepository);
  });

  function completedSession(
    lessonId: string,
    accuracy: number,
    completedAt: string,
    userId = USER_ID,
  ): TypingSession {
    const correctCharacters = Math.round(100 * accuracy);
    return TypingSession.reconstruct({
      id: SessionId.create(),
      userId: SessionId.create(userId),
      lessonId: SessionId.create(lessonId),
      layout: Layout.create("ABNT2"),
      state: "COMPLETED",
      startedAt: new Date(completedAt),
      completedAt: new Date(completedAt),
      activeDurationMs: 60_000,
      metrics: SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters,
        incorrectCharacters: 100 - correctCharacters,
        correctedErrors: 0,
        finalUncorrectedErrors: 0,
        accuracy,
        grossWpm: 30,
        netWpm: 30,
        activeDurationMs: 60_000,
        averageLatencyMs: 300,
      }),
      keystrokes: [],
      pausedAt: null,
      totalPausedDurationMs: 0,
    });
  }

  async function saveCompleted(
    lessonId: string,
    accuracy: number,
    completedAt: string,
    userId = USER_ID,
  ): Promise<void> {
    await sessionRepository.save(
      completedSession(lessonId, accuracy, completedAt, userId),
    );
  }

  it("RN32 - sem tentativas → lista vazia", async () => {
    const result = await getLessonPerformance.execute(USER_ID);
    expect(result).toEqual([]);
  });

  it("RN32 - melhor precisão ≥ 0.95 → MASTERED (mesmo que a última seja fraca)", async () => {
    await saveCompleted(LESSON_A, 0.9, "2026-01-02T00:00:00.000Z");
    await saveCompleted(LESSON_A, 0.97, "2026-01-03T00:00:00.000Z");

    const result = await getLessonPerformance.execute(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      lessonId: LESSON_A,
      attempts: 2,
      bestAccuracy: 0.97,
      lastAccuracy: 0.97,
      status: "MASTERED",
    });
  });

  it("RN32 - 1 tentativa → PRACTICING (nunca REVIEW na primeira)", async () => {
    await saveCompleted(LESSON_A, 0.5, "2026-01-02T00:00:00.000Z");

    const result = await getLessonPerformance.execute(USER_ID);
    expect(result[0]).toMatchObject({
      attempts: 1,
      bestAccuracy: 0.5,
      lastAccuracy: 0.5,
      status: "PRACTICING",
    });
  });

  it("RN32 - 2ª tentativa com last < 0.60 → REVIEW", async () => {
    await saveCompleted(LESSON_A, 0.8, "2026-01-02T00:00:00.000Z");
    await saveCompleted(LESSON_A, 0.55, "2026-01-03T00:00:00.000Z");

    const result = await getLessonPerformance.execute(USER_ID);
    expect(result[0]).toMatchObject({
      attempts: 2,
      bestAccuracy: 0.8,
      lastAccuracy: 0.55,
      status: "REVIEW",
    });
  });

  it("RN32 - isolamento por usuário (RN17): sessões de outro usuário não contam", async () => {
    await saveCompleted(LESSON_A, 0.97, "2026-01-02T00:00:00.000Z");
    await saveCompleted(
      LESSON_A,
      0.5,
      "2026-01-03T00:00:00.000Z",
      OTHER_USER_ID,
    );

    const result = await getLessonPerformance.execute(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      attempts: 1,
      bestAccuracy: 0.97,
      lastAccuracy: 0.97,
      status: "MASTERED",
    });
  });

  it("RN32 - agrega por lição e ordena por lessonId (determinístico)", async () => {
    await saveCompleted(LESSON_B, 0.9, "2026-01-02T00:00:00.000Z");
    await saveCompleted(LESSON_B, 0.92, "2026-01-03T00:00:00.000Z");
    await saveCompleted(LESSON_A, 0.6, "2026-01-02T00:00:00.000Z");
    await saveCompleted(LESSON_A, 0.7, "2026-01-03T00:00:00.000Z");

    const result = await getLessonPerformance.execute(USER_ID);
    expect(result.map((perf) => perf.lessonId)).toEqual([LESSON_A, LESSON_B]);
    expect(result[0]).toMatchObject({
      attempts: 2,
      bestAccuracy: 0.7,
      lastAccuracy: 0.7,
      status: "PRACTICING",
    });
    expect(result[1]).toMatchObject({
      attempts: 2,
      bestAccuracy: 0.92,
      lastAccuracy: 0.92,
      status: "PRACTICING",
    });
  });
});

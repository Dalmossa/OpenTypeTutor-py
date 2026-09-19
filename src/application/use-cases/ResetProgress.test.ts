import { describe, it, expect, beforeEach } from "vitest";
import { ResetProgress } from "./ResetProgress.js";
import { InMemoryTypingSessionRepository } from "../../infrastructure/repositories/InMemoryTypingSessionRepository.js";
import { InMemoryKeyPerformanceRepository } from "../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js";
import { InMemoryProgressCardRepository } from "../../infrastructure/repositories/InMemoryProgressCardRepository.js";
import { InMemoryProgressRepository } from "../../infrastructure/repositories/InMemoryProgressRepository.js";
import { InMemoryUserProfileRepository } from "../../infrastructure/repositories/InMemoryUserProfileRepository.js";
import { InMemoryDailyMetricsAggregateRepository } from "../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js";
import { InMemoryKeyMasteryTransitionRepository } from "../../infrastructure/repositories/InMemoryKeyMasteryTransitionRepository.js";
import { TypingSession } from "../../domain/entities/TypingSession.js";
import { KeyPerformance } from "../../domain/entities/KeyPerformance.js";
import { Progress } from "../../domain/entities/Progress.js";
import { ProgressCard } from "../../domain/entities/ProgressCard.js";
import { UserProfile } from "../../domain/entities/UserProfile.js";
import { SessionMetrics } from "../../domain/entities/SessionMetrics.js";
import { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import { KeyMasteryTransition } from "../../domain/entities/KeyMasteryTransition.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";
import { PedagogicalPhase } from "../../domain/value-objects/PedagogicalPhase.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440001";
const LESSON_ID = "550e8400-e29b-41d4-a716-446655440002";

describe("ResetProgress (RN31)", () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let progressCardRepository: InMemoryProgressCardRepository;
  let progressRepository: InMemoryProgressRepository;
  let profileRepository: InMemoryUserProfileRepository;
  let dailyAggregateRepository: InMemoryDailyMetricsAggregateRepository;
  let masteryTransitionRepository: InMemoryKeyMasteryTransitionRepository;
  let resetProgress: ResetProgress;

  beforeEach(async () => {
    sessionRepository = new InMemoryTypingSessionRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    progressCardRepository = new InMemoryProgressCardRepository();
    progressRepository = new InMemoryProgressRepository();
    profileRepository = new InMemoryUserProfileRepository();
    dailyAggregateRepository = new InMemoryDailyMetricsAggregateRepository();
    masteryTransitionRepository = new InMemoryKeyMasteryTransitionRepository();
    resetProgress = new ResetProgress(
      sessionRepository,
      keyPerformanceRepository,
      progressCardRepository,
      progressRepository,
      profileRepository,
      dailyAggregateRepository,
      masteryTransitionRepository,
    );

    const userId = SessionId.create(USER_ID);
    const otherUserId = SessionId.create(OTHER_USER_ID);
    const layout = Layout.create("ABNT2");

    await sessionRepository.save(
      TypingSession.create({
        userId,
        lessonId: SessionId.create(LESSON_ID),
        layout: Layout.create("ABNT2"),
      }),
    );
    await sessionRepository.save(
      TypingSession.create({
        userId: otherUserId,
        lessonId: SessionId.create(LESSON_ID),
        layout: Layout.create("ABNT2"),
      }),
    );

    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId,
        logicalKey: "a",
        layout: Layout.create("ABNT2"),
        attempts: 10,
        errors: 4,
        masteryState: "WEAK",
      }),
    );
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: otherUserId,
        logicalKey: "s",
        layout: Layout.create("ABNT2"),
        attempts: 10,
        errors: 1,
        masteryState: "CONSOLIDATING",
      }),
    );

    await progressCardRepository.save(
      ProgressCard.create({
        userId,
        date: new Date("2026-09-15T00:00:00.000Z"),
        phase: PedagogicalPhase.create("HOME_ROW"),
        lessonNumber: 3,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: "Seguir",
        previousBackspaceCount: 0,
        currentBackspaceCount: 1,
      }),
    );

    await progressRepository.save(
      Progress.create({
        userId,
        currentLessonId: SessionId.create(LESSON_ID),
        currentLevel: 2,
        completedLessons: 15,
        lastCompletedAt: new Date("2026-09-15T00:00:00.000Z"),
      }),
    );

    await profileRepository.save(
      UserProfile.create({
        userId,
        activeLayout: Layout.create("US-INTERNATIONAL"),
        currentLevel: 3,
      }),
    );

    const sessionMetrics = SessionMetrics.create({
      charactersTyped: 100,
      correctCharacters: 95,
      incorrectCharacters: 5,
      correctedErrors: 0,
      finalUncorrectedErrors: 5,
      accuracy: 0.95,
      grossWpm: 40,
      netWpm: 38,
      activeDurationMs: 60000,
      averageLatencyMs: 400,
    });
    await dailyAggregateRepository.save(
      DailyMetricsAggregate.create({
        userId,
        layout,
        date: "2026-09-15",
      }).merge(sessionMetrics, ["a", "s"]),
    );
    await masteryTransitionRepository.save(
      KeyMasteryTransition.create({
        userId,
        logicalKey: "a",
        layout,
        date: "2026-09-15",
        from: "LEARNING",
        to: "CONSOLIDATING",
      }),
    );
    await dailyAggregateRepository.save(
      DailyMetricsAggregate.create({
        userId: otherUserId,
        layout,
        date: "2026-09-15",
      }).merge(sessionMetrics, ["z"]),
    );
    await masteryTransitionRepository.save(
      KeyMasteryTransition.create({
        userId: otherUserId,
        logicalKey: "z",
        layout,
        date: "2026-09-15",
        from: "UNKNOWN",
        to: "LEARNING",
      }),
    );
  });

  it("RN31 - reset apaga sessões, KeyPerformance, Cartão de Progresso, Progress, agregados diários e timeline do usuário", async () => {
    const result = await resetProgress.execute(USER_ID);

    expect(result.reset).toBe(true);
    const sessions = await sessionRepository.findByUserId(
      SessionId.create(USER_ID),
    );
    const keys = await keyPerformanceRepository.findByUserId(
      SessionId.create(USER_ID),
    );
    const card = await progressCardRepository.findLatestByUserId(
      SessionId.create(USER_ID),
    );
    const progress = await progressRepository.findByUserId(
      SessionId.create(USER_ID),
    );
    const aggregates = await dailyAggregateRepository.findByUserBetween(
      SessionId.create(USER_ID),
      Layout.create("ABNT2"),
      "2026-01-01",
      "2026-12-31",
    );
    const transitions = await masteryTransitionRepository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-12-31",
    );

    expect(sessions).toHaveLength(0);
    expect(keys).toHaveLength(0);
    expect(card).toBeNull();
    expect(progress).toBeNull();
    expect(aggregates).toHaveLength(0);
    expect(transitions).toHaveLength(0);
  });

  it("RN31 - reset preserva dados de outro usuário (isolamento RN17)", async () => {
    await resetProgress.execute(USER_ID);

    const otherSessions = await sessionRepository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );
    const otherKeys = await keyPerformanceRepository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );
    const otherAggregates = await dailyAggregateRepository.findByUserBetween(
      SessionId.create(OTHER_USER_ID),
      Layout.create("ABNT2"),
      "2026-01-01",
      "2026-12-31",
    );
    const otherTransitions =
      await masteryTransitionRepository.findByUserBetween(
        SessionId.create(OTHER_USER_ID),
        "2026-01-01",
        "2026-12-31",
      );

    expect(otherSessions).toHaveLength(1);
    expect(otherKeys).toHaveLength(1);
    expect(otherKeys[0]?.logicalKey).toBe("s");
    expect(otherAggregates).toHaveLength(1);
    expect(otherAggregates[0]?.keysPracticed).toEqual(["z"]);
    expect(otherTransitions).toHaveLength(1);
    expect(otherTransitions[0]?.logicalKey).toBe("z");
  });

  it("RN31 - reset zera o nível do perfil para 1 preservando o layout", async () => {
    await resetProgress.execute(USER_ID);

    const profile = await profileRepository.findByUserId(
      SessionId.create(USER_ID),
    );
    expect(profile?.currentLevel).toBe(1);
    expect(profile?.activeLayout.value).toBe("US-INTERNATIONAL");
  });

  it("RN31 - reset é idempotente para usuário sem dados (não lança erro)", async () => {
    const result = await resetProgress.execute(OTHER_USER_ID);

    expect(result.reset).toBe(true);
    const profile = await profileRepository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );
    expect(profile).toBeNull();
  });
});

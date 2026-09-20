import os from "os";
import crypto from "crypto";
import autocannon from "autocannon";
import type { DataSource } from "typeorm";
import { SessionId } from "../src/domain/value-objects/SessionId.js";
import { Layout } from "../src/domain/value-objects/Layout.js";
import { Lesson } from "../src/domain/entities/Lesson.js";
import { SessionMetrics } from "../src/domain/entities/SessionMetrics.js";
import type { KeystrokeEventProps } from "../src/domain/entities/KeystrokeEvent.js";
import { TypeOrmLessonRepository } from "../src/infrastructure/repositories/TypeOrmLessonRepository.js";
import { TypeOrmUserRepository } from "../src/infrastructure/repositories/TypeOrmUserRepository.js";
import { TypeOrmUserProfileRepository } from "../src/infrastructure/repositories/TypeOrmUserProfileRepository.js";
import { TypeOrmTypingSessionRepository } from "../src/infrastructure/repositories/TypeOrmTypingSessionRepository.js";
import { TypeOrmKeyPerformanceRepository } from "../src/infrastructure/repositories/TypeOrmKeyPerformanceRepository.js";
import { TypeOrmProgressRepository } from "../src/infrastructure/repositories/TypeOrmProgressRepository.js";
import { TypeOrmProgressCardRepository } from "../src/infrastructure/repositories/TypeOrmProgressCardRepository.js";
import { TypeOrmPracticePacingRepository } from "../src/infrastructure/repositories/TypeOrmPracticePacingRepository.js";
import { TypeOrmDailyMetricsAggregateRepository } from "../src/infrastructure/repositories/TypeOrmDailyMetricsAggregateRepository.js";
import { TypeOrmKeyMasteryTransitionRepository } from "../src/infrastructure/repositories/TypeOrmKeyMasteryTransitionRepository.js";
import { InMemoryRateLimiter } from "../src/infrastructure/rateLimit/InMemoryRateLimiter.js";
import { createRateLimitMiddleware } from "../src/presentation/middlewares/rateLimitMiddleware.js";
import { rateLimitParams } from "../src/infrastructure/auth/rateLimitParams.js";
import { InMemoryNGramRepository } from "../src/infrastructure/repositories/InMemoryNGramRepository.js";
import { BcryptPasswordHasher } from "../src/infrastructure/auth/BcryptPasswordHasher.js";
import { AuthPasswordValidator } from "../src/infrastructure/auth/AuthPasswordValidator.js";
import { JwtTokenService } from "../src/infrastructure/auth/JwtTokenService.js";
import { createAuthMiddleware } from "../src/presentation/middlewares/authMiddleware.js";
import { createApp } from "../src/presentation/app.js";
import { RegisterUser } from "../src/application/use-cases/RegisterUser.js";
import { Login } from "../src/application/use-cases/Login.js";
import { RefreshToken } from "../src/application/use-cases/RefreshToken.js";
import { GetUser } from "../src/application/use-cases/GetUser.js";
import { UpdateUserLayout } from "../src/application/use-cases/UpdateUserLayout.js";
import { ListLessons } from "../src/application/use-cases/ListLessons.js";
import { GetLesson } from "../src/application/use-cases/GetLesson.js";
import { StartTypingSession } from "../src/application/use-cases/StartTypingSession.js";
import { PauseTypingSession } from "../src/application/use-cases/PauseTypingSession.js";
import { ResumeTypingSession } from "../src/application/use-cases/ResumeTypingSession.js";
import { AbandonTypingSession } from "../src/application/use-cases/AbandonTypingSession.js";
import { SubmitTypingSession } from "../src/application/use-cases/SubmitTypingSession.js";
import { GetReinforcementLesson } from "../src/application/use-cases/GetReinforcementLesson.js";
import { GetUserProgress } from "../src/application/use-cases/GetUserProgress.js";
import { GetUserKeyPerformance } from "../src/application/use-cases/GetUserKeyPerformance.js";
import { GetNextPedagogicalLesson } from "../src/application/use-cases/GetNextPedagogicalLesson.js";
import { SubmitProgressCard } from "../src/application/use-cases/SubmitProgressCard.js";
import { GetPracticeStatus } from "../src/application/use-cases/GetPracticeStatus.js";
import { CheckErgonomicSafety } from "../src/application/use-cases/CheckErgonomicSafety.js";
import { GetDashboardHabits } from "../src/application/use-cases/GetDashboardHabits.js";
import { GetDashboardMastery } from "../src/application/use-cases/GetDashboardMastery.js";
import { GetDashboardProximity } from "../src/application/use-cases/GetDashboardProximity.js";
import { GetLessonPerformance } from "../src/application/use-cases/GetLessonPerformance.js";
import {
  TypingSessionEntity,
  type TypingSessionRow,
} from "../src/infrastructure/database/entities/index.js";

export const BENCH_LESSON_ID = "10000000-0000-4000-8000-000000000001";

const LETTERS: Array<{ logicalKey: string; physicalKey: string }> = [
  "a",
  "s",
  "d",
  "f",
  "j",
  "k",
  "l",
].map((logicalKey) => ({
  logicalKey,
  physicalKey: `Key${logicalKey.toUpperCase()}`,
}));

export function buildKeystrokes(count: number): KeystrokeEventProps[] {
  const keystrokes: KeystrokeEventProps[] = [];
  for (let i = 0; i < count; i++) {
    const entry = LETTERS[i % LETTERS.length];
    if (entry === undefined) {
      continue;
    }
    keystrokes.push({
      expectedKey: entry.logicalKey,
      typedKey: entry.logicalKey,
      physicalKey: entry.physicalKey,
      logicalKey: entry.logicalKey,
      eventType: "CORRECT",
      timestampMs: 100 + i * 12,
      latencyMs: i % 2 === 0 ? 90 : 120,
      composedCharacter: null,
    });
  }
  return keystrokes;
}

export function printReferenceEnvironment(): void {
  const cpus = os.cpus();
  const cpuModel = (cpus[0]?.model ?? "desconhecido").trim();
  console.info("Ambiente de referência (RNF06):");
  console.info(`  OS: ${os.platform()} ${os.release()}`);
  console.info(`  CPU: ${cpuModel} (${String(cpus.length)} núcleos lógicos)`);
  console.info(`  RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GiB`);
  console.info(`  Node: ${process.version}`);
  console.info("");
}

export function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export async function jsonResponse(
  res: Response,
): Promise<{ status: number; body: unknown }> {
  const body = (await res.json()) as unknown;
  return { status: res.status, body };
}

export function buildApp(dataSource: DataSource) {
  const userRepository = new TypeOrmUserRepository(dataSource);
  const userProfileRepository = new TypeOrmUserProfileRepository(dataSource);
  const lessonRepository = new TypeOrmLessonRepository(dataSource);
  const sessionRepository = new TypeOrmTypingSessionRepository(dataSource);
  const keyPerformanceRepository = new TypeOrmKeyPerformanceRepository(
    dataSource,
  );
  const progressRepository = new TypeOrmProgressRepository(dataSource);
  const progressCardRepository = new TypeOrmProgressCardRepository(dataSource);
  const pacingRepository = new TypeOrmPracticePacingRepository(dataSource);
  const dailyAggregateRepository = new TypeOrmDailyMetricsAggregateRepository(
    dataSource,
  );
  const masteryTransitionRepository = new TypeOrmKeyMasteryTransitionRepository(
    dataSource,
  );
  const passwordHasher = new BcryptPasswordHasher();
  const passwordValidator = new AuthPasswordValidator();
  const tokenService = new JwtTokenService();
  const nGramRepository = new InMemoryNGramRepository();

  const rateLimiter = new InMemoryRateLimiter();
  const loginRateLimiter = createRateLimitMiddleware(rateLimiter, {
    keyPrefix: "login",
    maxAttempts: rateLimitParams.LOGIN_MAX_ATTEMPTS,
    windowMs: rateLimitParams.LOGIN_WINDOW_MS,
  });
  const refreshRateLimiter = createRateLimitMiddleware(rateLimiter, {
    keyPrefix: "refresh",
    maxAttempts: rateLimitParams.REFRESH_MAX_ATTEMPTS,
    windowMs: rateLimitParams.REFRESH_WINDOW_MS,
  });

  const app = createApp({
    authMiddleware: createAuthMiddleware(tokenService),
    loginRateLimiter,
    refreshRateLimiter,
    registerUser: new RegisterUser(
      userRepository,
      passwordHasher,
      passwordValidator,
    ),
    login: new Login(userRepository, passwordHasher, tokenService),
    refreshToken: new RefreshToken(tokenService),
    getUser: new GetUser(userRepository, userProfileRepository),
    updateUserLayout: new UpdateUserLayout(userProfileRepository),
    listLessons: new ListLessons(lessonRepository, userProfileRepository),
    getLesson: new GetLesson(lessonRepository),
    startSession: new StartTypingSession(
      sessionRepository,
      lessonRepository,
      userProfileRepository,
      pacingRepository,
    ),
    pauseSession: new PauseTypingSession(sessionRepository),
    resumeSession: new ResumeTypingSession(sessionRepository),
    abandonSession: new AbandonTypingSession(sessionRepository),
    submitSession: new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      pacingRepository,
      dailyAggregateRepository,
      userProfileRepository,
      masteryTransitionRepository,
    ),
    getReinforcementLesson: new GetReinforcementLesson(
      userProfileRepository,
      keyPerformanceRepository,
      nGramRepository,
    ),
    getUserProgress: new GetUserProgress(progressRepository, lessonRepository),
    getUserKeyPerformance: new GetUserKeyPerformance(
      userProfileRepository,
      keyPerformanceRepository,
    ),
    getNextPedagogicalLesson: new GetNextPedagogicalLesson(
      progressCardRepository,
      lessonRepository,
    ),
    submitProgressCard: new SubmitProgressCard(
      progressCardRepository,
      lessonRepository,
    ),
    checkErgonomicSafety: new CheckErgonomicSafety(),
    getPracticeStatus: new GetPracticeStatus(pacingRepository),
    getLessonPerformance: new GetLessonPerformance(sessionRepository),
    getDashboardHabits: new GetDashboardHabits(
      userProfileRepository,
      dailyAggregateRepository,
    ),
    getDashboardMastery: new GetDashboardMastery(
      userProfileRepository,
      keyPerformanceRepository,
      masteryTransitionRepository,
    ),
    getDashboardProximity: new GetDashboardProximity(
      userProfileRepository,
      keyPerformanceRepository,
    ),
  });

  return app;
}

export async function seedLesson(dataSource: DataSource): Promise<string> {
  const lessonRepository = new TypeOrmLessonRepository(dataSource);
  const lessonId = SessionId.create(BENCH_LESSON_ID);
  await lessonRepository.save(
    Lesson.create({
      id: lessonId,
      level: 1,
      title: "Lições benchmark",
      content: "asdf jkl;",
      targetKeys: ["a", "s", "d", "f", "j", "k", "l"],
      difficulty: "GUIDED",
      type: "INTRODUCTION",
      layout: Layout.create("ABNT2"),
    }),
  );
  return lessonId.value;
}

export async function seedCompletedSessions(
  dataSource: DataSource,
  userId: string,
  lessonId: string,
): Promise<void> {
  const repo = dataSource.getRepository(TypingSessionEntity);
  const keystrokesPayload = buildKeystrokes(60);
  const now = Date.now();
  const rows: TypingSessionRow[] = Array.from({ length: 500 }, (_, index) => {
    const seededMetrics = SessionMetrics.create({
      charactersTyped: 60,
      correctCharacters: 54,
      incorrectCharacters: 6,
      correctedErrors: 4,
      finalUncorrectedErrors: 2,
      accuracy: 54 / 60,
      grossWpm: 42,
      netWpm: 38,
      activeDurationMs: 120_000,
      averageLatencyMs: 105,
    });
    return {
      id: crypto.randomUUID(),
      userId,
      lessonId,
      layout: "ABNT2",
      state: "COMPLETED",
      startedAt: new Date(now - (index + 1) * 3_600_000).toISOString(),
      completedAt: new Date(
        now - (index + 1) * 3_600_000 + 120_000,
      ).toISOString(),
      activeDurationMs: 120_000,
      metrics: JSON.stringify(seededMetrics.toJSON()),
      keystrokes: JSON.stringify(keystrokesPayload),
      pausedAt: null,
      totalPausedDurationMs: 0,
    };
  });
  await repo.save(rows);
}

export interface AutocannonReport {
  totalRequests: number;
  non2xx: number;
  requestsPerSecond: number;
  throughputKibS: number;
  averageMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p97_5Ms: number;
  p99Ms: number;
}

export async function runAutocannon(
  url: string,
  headers: Record<string, string>,
  body: string,
  options: {
    connections?: number;
    duration?: number;
    method?: "GET" | "POST";
  } = {},
): Promise<AutocannonReport> {
  const instance = autocannon({
    url,
    method: options.method ?? "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    connections: options.connections ?? 10,
    duration: options.duration ?? 10,
  });
  const responseTimes: number[] = [];
  instance.on(
    "response",
    (
      _client: unknown,
      _status: number,
      _bytes: number,
      responseTime: number,
    ) => {
      responseTimes.push(responseTime);
    },
  );
  const result = (await instance) as unknown as {
    requests: { average: number };
    throughput: { average: number };
    non2xx: number;
    latency: {
      p50: number;
      p90: number;
      p97_5: number;
      p99: number;
      average: number;
    };
  };

  const sortedLatencies = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.min(
    sortedLatencies.length - 1,
    Math.floor(sortedLatencies.length * 0.95),
  );

  return {
    totalRequests: sortedLatencies.length,
    non2xx: result.non2xx,
    requestsPerSecond: result.requests.average,
    throughputKibS: result.throughput.average / 1024,
    averageMs: result.latency.average,
    p50Ms: result.latency.p50,
    p90Ms: result.latency.p90,
    p95Ms: sortedLatencies[p95Index] ?? 0,
    p97_5Ms: result.latency.p97_5,
    p99Ms: result.latency.p99,
  };
}

export function printReport(
  title: string,
  report: AutocannonReport,
  p95BudgetMs = 150,
  label = "RNF06",
): boolean {
  const fulfilled = report.p95Ms <= p95BudgetMs;
  if (title !== "") {
    console.info(`${title}:`);
  }
  console.info(
    `  requisições: ${String(report.totalRequests)} (non-2xx: ${String(report.non2xx)})`,
  );
  console.info(`  requisições/s: ${report.requestsPerSecond.toFixed(0)}`);
  console.info(`  throughput: ${report.throughputKibS.toFixed(1)} KiB/s`);
  console.info(`  latência média: ${report.averageMs.toFixed(1)}ms`);
  console.info(`  latência p50: ${report.p50Ms.toFixed(1)}ms`);
  console.info(`  latência p90: ${report.p90Ms.toFixed(1)}ms`);
  console.info(`  latência p95 (calculado): ${report.p95Ms.toFixed(1)}ms`);
  console.info(`  latência p97.5: ${report.p97_5Ms.toFixed(1)}ms`);
  console.info(`  latência p99: ${report.p99Ms.toFixed(1)}ms`);
  console.info(
    `${label} (p95 ≤ ${p95BudgetMs}ms): ${fulfilled ? "ATENDIDO" : "NÃO ATENDIDO"}`,
  );
  return fulfilled;
}

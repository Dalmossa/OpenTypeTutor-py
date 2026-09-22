import request from "supertest";
import { describe, expect, it, vi, type Mock } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import { AppError } from "../../shared/errors/AppError.js";
import type { LessonDTO } from "../../domain/entities/Lesson.js";
import type { SessionMetricsProps } from "../../domain/entities/SessionMetrics.js";
import type {
  GetUserProgressResponseDTO,
  ResetProgressResponseDTO,
} from "../../application/dtos/ProgressDTOs.js";
import type { SessionCommandResponseDTO } from "../../application/dtos/SessionDTOs.js";
import type { RefreshTokenResponseDTO } from "../../application/dtos/RefreshTokenDTO.js";
import type {
  GetUserResponseDTO,
  UpdateUserLayoutResponseDTO,
} from "../../application/dtos/UserDTOs.js";
import type { PracticeStatusDTO } from "../../application/dtos/PracticePacingDTOs.js";
import type { LessonPerformanceDTO } from "../../application/dtos/LessonPerformanceDTOs.js";
import type {
  CheckErgonomicSafetyResponseDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardResponseDTO,
} from "../../application/dtos/ProgressCardDTOs.js";
import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from "../../application/dtos/DashboardDTOs.js";
import { AppNestModule, type NestDependencyValues } from "./appNest.js";
import { AppExceptionFilter } from "./app-exception.filter.js";
import { TOKENS } from "./nestTokens.js";

const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const LESSON_ID = "1f0a1f2b-cbd0-4c8a-9f45-3d3b1c2f4e5a";

const LESSON_FIXTURE: LessonDTO = {
  id: LESSON_ID,
  level: 1,
  title: "Introdução à linha inicial",
  content: "asdf jkl;",
  targetKeys: ["a", "s"],
  difficulty: "GUIDED",
  type: "INTRODUCTION",
  layout: "ABNT2",
  pedagogicalPhase: null,
  lessonInPhase: null,
};

const METRICS_FIXTURE: SessionMetricsProps = {
  charactersTyped: 10,
  correctCharacters: 9,
  incorrectCharacters: 1,
  correctedErrors: 0,
  finalUncorrectedErrors: 1,
  accuracy: 0.9,
  grossWpm: 20,
  netWpm: 18,
  activeDurationMs: 30000,
  averageLatencyMs: 120,
};

const PROGRESS_FIXTURE: GetUserProgressResponseDTO = {
  currentLevel: 1,
  completedLessons: 0,
  lastCompletedAt: null,
  currentLesson: null,
  levelCompletionRate: 0,
};

const PEDAGOGICAL_LESSON_FIXTURE: GetNextPedagogicalLessonResponseDTO = {
  lesson: LESSON_FIXTURE,
  shouldVaryExercise: false,
  reason: "advance",
  progressCard: null,
};

const PROGRESS_CARD_FIXTURE: SubmitProgressCardResponseDTO = {
  advanced: true,
  progressCard: {
    id: "3bab2b40-0000-4000-8000-000000000001",
    userId: TEST_USER_ID,
    date: "2026-09-15T00:00:00.000Z",
    phase: "ERGONOMICS_SETUP",
    lessonNumber: 1,
    insecureKeys: [],
    discomfortReported: false,
    discomfortDetail: null,
    nextSessionNote: "Lição 1 concluída",
    previousBackspaceCount: 0,
    currentBackspaceCount: 2,
  },
};

const ERGONOMIC_FIXTURE: CheckErgonomicSafetyResponseDTO = {
  safe: true,
  guidance: "Postura adequada. Pode iniciar o treino.",
};

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: {
      issues: Array<{ path: string; code: string; message: string }>;
    };
  };
}

interface TestCalls {
  register: Mock;
  login: Mock;
  refresh: Mock;
  getUser: Mock;
  updateLayout: Mock;
  listLessons: Mock;
  getLesson: Mock;
  startSession: Mock;
  pause: Mock;
  resume: Mock;
  abandon: Mock;
  submit: Mock;
  reinforcement: Mock;
  progress: Mock;
  resetProgress: Mock;
  keyPerformance: Mock;
  nextPedagogicalLesson: Mock;
  submitCard: Mock;
  ergonomic: Mock;
  practiceStatus: Mock;
  lessonPerformance: Mock;
  dashboardHabits: Mock;
  dashboardMastery: Mock;
  dashboardProximity: Mock;
}

async function buildNestApp(
  overrides: Partial<NestDependencyValues> = {},
): Promise<{
  app: INestApplication;
  calls: TestCalls;
}> {
  const register = vi.fn((): Promise<{ userId: string }> =>
    Promise.resolve({ userId: TEST_USER_ID }),
  );
  const login = vi.fn(
    (): Promise<{ accessToken: string; refreshToken: string }> =>
      Promise.resolve({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      }),
  );
  const refresh = vi.fn((): RefreshTokenResponseDTO => ({
    accessToken: "access-token-2",
    refreshToken: "refresh-token-2",
  }));
  const getUser = vi.fn((): Promise<GetUserResponseDTO> =>
    Promise.resolve({
      id: TEST_USER_ID,
      name: "Ana",
      email: "ana@email.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      activeLayout: "ABNT2",
      currentLevel: 1,
      timezone: "America/Sao_Paulo",
    }),
  );
  const updateLayout = vi.fn((): Promise<UpdateUserLayoutResponseDTO> =>
    Promise.resolve({
      userId: TEST_USER_ID,
      activeLayout: "US-INTERNATIONAL",
      currentLevel: 1,
    }),
  );
  const listLessons = vi.fn((): Promise<LessonDTO[]> =>
    Promise.resolve([LESSON_FIXTURE]),
  );
  const getLesson = vi.fn((): Promise<LessonDTO> =>
    Promise.resolve(LESSON_FIXTURE),
  );
  const startSession = vi.fn((): Promise<SessionCommandResponseDTO> =>
    Promise.resolve({
      sessionId: SESSION_ID,
      state: "RUNNING",
    } satisfies SessionCommandResponseDTO),
  );
  const pause = vi.fn((): Promise<SessionCommandResponseDTO> =>
    Promise.resolve({
      sessionId: SESSION_ID,
      state: "PAUSED",
    } satisfies SessionCommandResponseDTO),
  );
  const resume = vi.fn((): Promise<SessionCommandResponseDTO> =>
    Promise.resolve({
      sessionId: SESSION_ID,
      state: "RUNNING",
    } satisfies SessionCommandResponseDTO),
  );
  const abandon = vi.fn((): Promise<SessionCommandResponseDTO> =>
    Promise.resolve({
      sessionId: SESSION_ID,
      state: "ABANDONED",
    } satisfies SessionCommandResponseDTO),
  );
  const submit = vi.fn(
    (): Promise<{
      sessionId: string;
      state: "COMPLETED";
      metrics: SessionMetricsProps;
    }> =>
      Promise.resolve({
        sessionId: SESSION_ID,
        state: "COMPLETED",
        metrics: METRICS_FIXTURE,
      }),
  );
  const reinforcement = vi.fn((): Promise<LessonDTO> =>
    Promise.resolve(LESSON_FIXTURE),
  );
  const progress = vi.fn((): Promise<GetUserProgressResponseDTO> =>
    Promise.resolve(PROGRESS_FIXTURE),
  );
  const resetProgress = vi.fn((): Promise<ResetProgressResponseDTO> =>
    Promise.resolve({ reset: true }),
  );
  const keyPerformance = vi.fn((): Promise<unknown[]> => Promise.resolve([]));
  const nextPedagogicalLesson = vi.fn(
    (): Promise<GetNextPedagogicalLessonResponseDTO> =>
      Promise.resolve(PEDAGOGICAL_LESSON_FIXTURE),
  );
  const submitCard = vi.fn((): Promise<SubmitProgressCardResponseDTO> =>
    Promise.resolve(PROGRESS_CARD_FIXTURE),
  );
  const ergonomic = vi.fn((): Promise<CheckErgonomicSafetyResponseDTO> =>
    Promise.resolve(ERGONOMIC_FIXTURE),
  );
  const practiceStatus = vi.fn((): Promise<PracticeStatusDTO> =>
    Promise.resolve({
      accumulatedActiveMs: 0,
      practiceBlockMs: 900000,
      minBreakMs: 180000,
      breakRequired: false,
      breakRemainingMs: 0,
    }),
  );
  const lessonPerformance = vi.fn((): Promise<LessonPerformanceDTO[]> =>
    Promise.resolve([]),
  );
  const dashboardHabits = vi.fn((): Promise<GetDashboardHabitsResponseDTO> =>
    Promise.resolve({
      kpis: {
        netWpm: 0,
        accuracy: 0,
        averageLatencyMs: 0,
        sessionsCompleted: 0,
        daysActive: 0,
        keysPracticed: 0,
      },
      trend: [],
      heatmap: [],
    }),
  );
  const dashboardMastery = vi.fn((): Promise<GetDashboardMasteryResponseDTO> =>
    Promise.resolve({
      transitions: [],
      countsByState: {
        UNKNOWN: 0,
        LEARNING: 0,
        CONSOLIDATING: 0,
        MASTERED: 0,
        WEAK: 0,
      },
    }),
  );
  const dashboardProximity = vi.fn(
    (): Promise<GetDashboardProximityResponseDTO> =>
      Promise.resolve({ keys: [] }),
  );
  const tokenService = {
    signAccessToken: vi.fn(() => "access-token"),
    signRefreshToken: vi.fn(() => "refresh-token"),
    verifyAccessToken: vi.fn((token: string) => {
      if (token === "expired") {
        throw AppError.unauthorized("TOKEN_EXPIRED", "Token expirado");
      }
      return TEST_USER_ID;
    }),
    verifyRefreshToken: vi.fn((): { userId: string; jti: string } => ({
      userId: TEST_USER_ID,
      jti: "jti-1",
    })),
    revokeRefreshToken: vi.fn(),
  };

  const deps: NestDependencyValues = {
    [TOKENS.TOKEN_SERVICE]: tokenService,
    [TOKENS.REGISTER_USER]: { execute: register },
    [TOKENS.LOGIN]: { execute: login },
    [TOKENS.REFRESH_TOKEN]: { execute: refresh },
    [TOKENS.GET_USER]: { execute: getUser },
    [TOKENS.UPDATE_USER_LAYOUT]: { execute: updateLayout },
    [TOKENS.LIST_LESSONS]: { execute: listLessons },
    [TOKENS.GET_LESSON]: { execute: getLesson },
    [TOKENS.START_SESSION]: { execute: startSession },
    [TOKENS.PAUSE_SESSION]: { execute: pause },
    [TOKENS.RESUME_SESSION]: { execute: resume },
    [TOKENS.ABANDON_SESSION]: { execute: abandon },
    [TOKENS.SUBMIT_SESSION]: { execute: submit },
    [TOKENS.GET_REINFORCEMENT_LESSON]: { execute: reinforcement },
    [TOKENS.GET_USER_PROGRESS]: { execute: progress },
    [TOKENS.RESET_PROGRESS]: { execute: resetProgress },
    [TOKENS.GET_USER_KEY_PERFORMANCE]: { execute: keyPerformance },
    [TOKENS.GET_NEXT_PEDAGOGICAL_LESSON]: { execute: nextPedagogicalLesson },
    [TOKENS.SUBMIT_PROGRESS_CARD]: { execute: submitCard },
    [TOKENS.CHECK_ERGONOMIC_SAFETY]: { execute: ergonomic },
    [TOKENS.GET_PRACTICE_STATUS]: { execute: practiceStatus },
    [TOKENS.GET_LESSON_PERFORMANCE]: { execute: lessonPerformance },
    [TOKENS.GET_DASHBOARD_HABITS]: { execute: dashboardHabits },
    [TOKENS.GET_DASHBOARD_MASTERY]: { execute: dashboardMastery },
    [TOKENS.GET_DASHBOARD_PROXIMITY]: { execute: dashboardProximity },
    ...overrides,
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppNestModule.forRoot(deps)],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new AppExceptionFilter());
  await app.init();

  return {
    app,
    calls: {
      register,
      login,
      refresh,
      getUser,
      updateLayout,
      listLessons,
      getLesson,
      startSession,
      pause,
      resume,
      abandon,
      submit,
      reinforcement,
      progress,
      resetProgress,
      keyPerformance,
      nextPedagogicalLesson,
      submitCard,
      ergonomic,
      practiceStatus,
      lessonPerformance,
      dashboardHabits,
      dashboardMastery,
      dashboardProximity,
    },
  };
}

function asErrorBody(body: unknown): ErrorBody {
  return body as ErrorBody;
}

function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

describe("Nest - rotas de autenticação (TASK-082)", () => {
  it("POST /auth/register com corpo válido → 201", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha-segura" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: TEST_USER_ID });
    expect(calls.register).toHaveBeenCalledOnce();
    await app.close();
  });

  it("POST /auth/register sem nome → 422 VALIDATION_ERROR", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/register")
      .send({ name: "   ", email: "ana@email.com", password: "senha-segura" });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(asErrorBody(res.body).error.details?.issues[0]).toMatchObject({
      path: "name",
      message: "Nome é obrigatório",
    });
    await app.close();
  });

  it("POST /auth/login com corpo válido → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha-segura" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(calls.login).toHaveBeenCalledOnce();
    await app.close();
  });

  it("POST /auth/refresh com refreshToken → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/refresh")
      .send({ refreshToken: "refresh-token" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: "access-token-2",
      refreshToken: "refresh-token-2",
    });
    expect(calls.refresh).toHaveBeenCalledOnce();
    await app.close();
  });
});

describe("Nest - AuthGuard e rotas protegidas (RNF-tutor)", () => {
  it("GET /users/me sem token → 401 UNAUTHORIZED", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app)).get("/users/me");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
    await app.close();
  });

  it("GET /users/me com token expirado → 401 TOKEN_EXPIRED", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer expired");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("TOKEN_EXPIRED");
    await app.close();
  });

  it("GET /users/me com token válido → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(asErrorBody(res.body).error).toBeUndefined();
    expect(calls.getUser).toHaveBeenCalledOnce();
    await app.close();
  });
});

describe("Nest - rotas de sessão, lições e pedagógico (TASK-082)", () => {
  it("POST /sessions com lessonId → 201", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/sessions")
      .set("Authorization", "Bearer valid")
      .send({ lessonId: LESSON_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ sessionId: SESSION_ID, state: "RUNNING" });
    expect(calls.startSession).toHaveBeenCalledOnce();
    await app.close();
  });

  it("POST /sessions/:id/pause → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post(`/sessions/${SESSION_ID}/pause`)
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sessionId: SESSION_ID, state: "PAUSED" });
    expect(calls.pause).toHaveBeenCalledOnce();
    await app.close();
  });

  it("POST /sessions/:id/submit aceita DEAD_KEY_COMPOSE com expectedKey vazio (compose)", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer valid")
      .send({
        keystrokes: [
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
            physicalKey: "KeyA",
            logicalKey: "á",
            eventType: "CORRECT",
            timestampMs: 1150,
            latencyMs: 100,
            composedCharacter: "á",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(calls.submit).toHaveBeenCalledOnce();
    await app.close();
  });

  it("POST /sessions/:id/submit rejeita expectedKey vazio em evento digitado → 422", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer valid")
      .send({
        keystrokes: [
          {
            expectedKey: "",
            physicalKey: "KeyA",
            logicalKey: "a",
            eventType: "CORRECT",
            timestampMs: 100,
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("GET /lessons/:id com uuid inválido → 422 VALIDATION_ERROR", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/lessons/nao-e-uuid")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("GET /lessons → 200 e lista um lesson", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/lessons")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([LESSON_FIXTURE]);
    expect(calls.listLessons).toHaveBeenCalledOnce();
    await app.close();
  });

  it("GET /me/progress → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/progress")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(PROGRESS_FIXTURE);
    expect(calls.progress).toHaveBeenCalledOnce();
    await app.close();
  });

  it("GET /me/key-performance → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/key-performance")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(calls.keyPerformance).toHaveBeenCalledOnce();
    await app.close();
  });

  it("RN31 - DELETE /me/progress → 200 e reseta o progresso", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .delete("/me/progress")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reset: true });
    expect(calls.resetProgress).toHaveBeenCalledOnce();
    await app.close();
  });

  it("RN31 - DELETE /me/progress sem token → 401 UNAUTHORIZED", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app)).delete("/me/progress");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
    expect(calls.resetProgress).not.toHaveBeenCalled();
    await app.close();
  });

  it("RN32 - GET /me/lessons/performance → 200 com userId do token", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/lessons/performance")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(calls.lessonPerformance).toHaveBeenCalledOnce();
    await app.close();
  });
});

describe("Nest - tratamento de erros (TASK-082)", () => {
  it("rota inexistente → 404 NOT_FOUND (Rota não encontrada)", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app)).get("/rota-inexistente");

    expect(res.status).toBe(404);
    expect(asErrorBody(res.body).error.code).toBe("NOT_FOUND");
    expect(asErrorBody(res.body).error.message).toBe("Rota não encontrada");
    await app.close();
  });

  it("erro de domínio propaga via AppExceptionFilter (SessionNotOwned → 403)", async () => {
    const { app } = await buildNestApp({
      [TOKENS.PAUSE_SESSION]: {
        execute: (): Promise<SessionCommandResponseDTO> =>
          Promise.reject(
            new AppError(
              "SESSION_NOT_OWNED",
              "Sessão não pertence ao usuário",
              403,
            ),
          ),
      },
    });
    const res = await request(httpServer(app))
      .post(`/sessions/${SESSION_ID}/pause`)
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(403);
    expect(asErrorBody(res.body).error.code).toBe("SESSION_NOT_OWNED");
    await app.close();
  });
});

describe("Nest - health check (TASK-082)", () => {
  it("GET /health → 200 ok", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app)).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect((res.body as { timestamp?: unknown }).timestamp).toBeTypeOf(
      "string",
    );
    await app.close();
  });
});

import request from "supertest";
import { describe, expect, it, vi, type Mock } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import { AppError } from "../../shared/errors/AppError.js";
import {
  DiscomfortSignaledError,
  ProfileNotOwnedError,
  SessionNotOwnedError,
  UserAlreadyExistsError,
} from "../../domain/errors/DomainError.js";
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
import type {
  PracticeStatusDTO,
  LessonPacingStatusDTO,
} from "../../application/dtos/PracticePacingDTOs.js";
import type { AdminSettingsDTO } from "../../application/dtos/AdminSettingsDTOs.js";
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

const ADMIN_SETTINGS_FIXTURE: AdminSettingsDTO = {
  macroBreakEnabled: true,
  macroLessonsThreshold: 3,
  macroBreakDurationMs: 10800000,
  microBlockDurationMs: 900000,
  microBreakDurationMs: 180000,
};

const LESSON_PACING_FIXTURE: LessonPacingStatusDTO = {
  lessonsSinceMacroBreak: 2,
  macroLessonsThreshold: 3,
  macroBreakEnabled: true,
  macroBreakDurationMs: 10800000,
  macroBreakRequired: false,
  macroBreakRemainingMs: 0,
  nextAvailableAt: null,
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
  requestPasswordReset: Mock;
  confirmPasswordReset: Mock;
  adminResetUserPassword: Mock;
  getAdminSettings: Mock;
  updateAdminSettings: Mock;
  lessonPacing: Mock;
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
  const requestPasswordReset = vi.fn((): Promise<{ message: string }> =>
    Promise.resolve({
      message: "Se o e-mail existir, enviaremos o link de recuperação",
    }),
  );
  const confirmPasswordReset = vi.fn((): Promise<{ message: string }> =>
    Promise.resolve({ message: "Senha redefinida com sucesso" }),
  );
  const adminResetUserPassword = vi.fn((): Promise<{ message: string }> =>
    Promise.resolve({ message: "Senha do usuário redefinida" }),
  );
  const getAdminSettings = vi.fn((): Promise<AdminSettingsDTO> =>
    Promise.resolve(ADMIN_SETTINGS_FIXTURE),
  );
  const updateAdminSettings = vi.fn((): Promise<AdminSettingsDTO> =>
    Promise.resolve(ADMIN_SETTINGS_FIXTURE),
  );
  const lessonPacing = vi.fn((): Promise<LessonPacingStatusDTO> =>
    Promise.resolve(LESSON_PACING_FIXTURE),
  );
  const tokenService = {
    signAccessToken: vi.fn(
      (userId: string, _role: "user" | "admin" = "user") =>
        `access-token-${userId}`,
    ),
    signRefreshToken: vi.fn(() => "refresh-token"),
    verifyAccessToken: vi.fn((token: string) => {
      if (token === "expired") {
        throw AppError.unauthorized("TOKEN_EXPIRED", "Token expirado");
      }
      // Token que faz o serviço de token lançar algo que não é `AppError` — é o
      // que o `jsonwebtoken` faz com token corrompido. Serve para provar que o
      // `AuthGuard` converte em 401 em vez de deixar escapar 500.
      if (token === "boom") {
        throw new Error("jwt malformed");
      }
      // Token de admin: as rotas /admin/* e /auth/admin/* só podem ser exercitadas
      // por um JWT cujo papel é admin. O default é 'user', então sem este ramo o
      // AdminGuard responderia 403 e o teste não provaria o caminho feliz.
      if (token === "admin-token") {
        return { userId: TEST_USER_ID, role: "admin" as const };
      }
      return { userId: TEST_USER_ID, role: "user" as const };
    }),
    verifyRefreshToken: vi.fn((): { userId: string; jti: string } => ({
      userId: TEST_USER_ID,
      jti: "jti-1",
    })),
    revokeRefreshToken: vi.fn(),
    revokeAllRefreshTokensForUser: vi.fn(() => 0),
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
    [TOKENS.REQUEST_PASSWORD_RESET]: { execute: requestPasswordReset },
    [TOKENS.CONFIRM_PASSWORD_RESET]: { execute: confirmPasswordReset },
    [TOKENS.ADMIN_RESET_USER_PASSWORD]: { execute: adminResetUserPassword },
    [TOKENS.GET_ADMIN_SETTINGS]: { execute: getAdminSettings },
    [TOKENS.UPDATE_ADMIN_SETTINGS]: { execute: updateAdminSettings },
    [TOKENS.GET_LESSON_PACING_STATUS]: { execute: lessonPacing },
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
      requestPasswordReset,
      confirmPasswordReset,
      adminResetUserPassword,
      getAdminSettings,
      updateAdminSettings,
      lessonPacing,
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

// ---------------------------------------------------------------------------
// Paridade de rotas entre os dois composition roots.
//
// Estes testes existem porque o achado que os motivou é de silêncio: os use
// cases existiam, eram testados no e2e e estavam registrados no
// `composition-root.ts` (Express, stack morta) — mas NÃO em `main-nest.ts`, que
// é o que `npm run dev` executa. O resultado era 404 em produção com a suíte
// verde. Um teste de porta não pega isso; o que pega é exercitar a rota HTTP no
// app Nest e exigir o código de negócio esperado.
// ---------------------------------------------------------------------------

describe("RN16/RN17 - recuperação de senha existe no app Nest", () => {
  it("POST /auth/forgot-password com e-mail válido → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/forgot-password")
      .send({ email: "ana@email.com" });

    expect(res.status).toBe(200);
    expect(calls.requestPasswordReset).toHaveBeenCalledOnce();
    expect(calls.requestPasswordReset).toHaveBeenCalledWith({
      email: "ana@email.com",
    });
    await app.close();
  });

  it("POST /auth/forgot-password é pública (sem token, 200)", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/forgot-password")
      .send({ email: "ana@email.com" });

    // Rota pública por design: quem pede recuperação pode estar sem sessão.
    expect(res.status).toBe(200);
    await app.close();
  });

  it("POST /auth/forgot-password com e-mail inválido → 422", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/forgot-password")
      .send({ email: "nao-e-email" });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("POST /auth/reset-password com token e nova senha → 200", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/reset-password")
      .send({ token: "abc123", newPassword: "nova-senha-123" });

    expect(res.status).toBe(200);
    expect(calls.confirmPasswordReset).toHaveBeenCalledWith({
      token: "abc123",
      newPassword: "nova-senha-123",
    });
    await app.close();
  });

  it("POST /auth/reset-password com senha curta → 422", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/reset-password")
      .send({ token: "abc123", newPassword: "curta" });

    expect(res.status).toBe(422);
    await app.close();
  });

  it("POST /auth/reset-password repete TOKEN_ALREADY_USED, não 500", async () => {
    const { app } = await buildNestApp({
      [TOKENS.CONFIRM_PASSWORD_RESET]: {
        execute: () =>
          Promise.reject(
            AppError.conflict(
              "TOKEN_ALREADY_USED",
              "Token de recuperação já utilizado",
            ),
          ),
      },
    });
    const res = await request(httpServer(app))
      .post("/auth/reset-password")
      .send({ token: "abc123", newPassword: "nova-senha-123" });

    expect(res.status).toBe(409);
    expect(asErrorBody(res.body).error.code).toBe("TOKEN_ALREADY_USED");
    await app.close();
  });
});

describe("RN16/RN17 - POST /auth/admin/reset-user-password exige admin no app Nest", () => {
  it("anônimo → 401, e o caso de uso NÃO é chamado", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/admin/reset-user-password")
      .send({ userId: TEST_USER_ID, newPassword: "nova-senha-123" });

    // A regressão que este bloco fecha: a rota mora no mount público `/auth`.
    // Sem AuthGuard, qualquer cliente anônimo com um userId redefinia a senha de
    // qualquer conta.
    expect(res.status).toBe(401);
    expect(calls.adminResetUserPassword).not.toHaveBeenCalled();
    await app.close();
  });

  it("usuário comum → 403 FORBIDDEN, e o caso de uso NÃO é chamado", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/admin/reset-user-password")
      .set("Authorization", "Bearer valid")
      .send({ userId: TEST_USER_ID, newPassword: "nova-senha-123" });

    expect(res.status).toBe(403);
    expect(asErrorBody(res.body).error.code).toBe("FORBIDDEN");
    expect(calls.adminResetUserPassword).not.toHaveBeenCalled();
    await app.close();
  });

  it("admin → 200 e o caso de uso é chamado", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/admin/reset-user-password")
      .set("Authorization", "Bearer admin-token")
      .send({ userId: TEST_USER_ID, newPassword: "nova-senha-123" });

    expect(res.status).toBe(200);
    expect(calls.adminResetUserPassword).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      newPassword: "nova-senha-123",
    });
    await app.close();
  });

  it("admin com userId que não é UUID → 422 antes de chegar ao caso de uso", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/auth/admin/reset-user-password")
      .set("Authorization", "Bearer admin-token")
      .send({ userId: "nao-e-uuid", newPassword: "nova-senha-123" });

    expect(res.status).toBe(422);
    expect(calls.adminResetUserPassword).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("RN34 - /admin/settings existe no app Nest e é restrito a admin", () => {
  it("anônimo em GET → 401", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app)).get("/admin/settings");

    expect(res.status).toBe(401);
    expect(calls.getAdminSettings).not.toHaveBeenCalled();
    await app.close();
  });

  it("usuário comum em GET → 403 FORBIDDEN", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/admin/settings")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(403);
    expect(calls.getAdminSettings).not.toHaveBeenCalled();
    await app.close();
  });

  it("admin em GET → 200 com as 5 chaves de RN34", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/admin/settings")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ADMIN_SETTINGS_FIXTURE);
    expect(calls.getAdminSettings).toHaveBeenCalledOnce();
    await app.close();
  });

  it("admin em PATCH → 200 e repassa só os campos enviados", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .patch("/admin/settings")
      .set("Authorization", "Bearer admin-token")
      .send({ macroBreakEnabled: false });

    expect(res.status).toBe(200);
    expect(calls.updateAdminSettings).toHaveBeenCalledWith({
      macroBreakEnabled: false,
    });
    await app.close();
  });

  it("PATCH com corpo vazio → 422 (pelo menos um campo)", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .patch("/admin/settings")
      .set("Authorization", "Bearer admin-token")
      .send({});

    expect(res.status).toBe(422);
    expect(calls.updateAdminSettings).not.toHaveBeenCalled();
    await app.close();
  });

  it("PATCH com limite negativo → 422", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .patch("/admin/settings")
      .set("Authorization", "Bearer admin-token")
      .send({ macroLessonsThreshold: -1 });

    expect(res.status).toBe(422);
    expect(calls.updateAdminSettings).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("RN34 - GET /me/lesson-pacing existe no app Nest", () => {
  it("sem token → 401", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app)).get("/me/lesson-pacing");

    expect(res.status).toBe(401);
    expect(calls.lessonPacing).not.toHaveBeenCalled();
    await app.close();
  });

  it("com token → 200 e deriva o userId do JWT", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/lesson-pacing")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(LESSON_PACING_FIXTURE);
    expect(calls.lessonPacing).toHaveBeenCalledWith(TEST_USER_ID);
    await app.close();
  });

  it("token expirado → 401 UNAUTHORIZED", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/lesson-pacing")
      .set("Authorization", "Bearer expired");

    expect(res.status).toBe(401);
    expect(calls.lessonPacing).not.toHaveBeenCalled();
    await app.close();
  });
});

// ---------------------------------------------------------------------------
// Cobertura migrada da pilha Express removida (ADR-024).
//
// Estas rotas e estas bordas **não** tinham teste neste arquivo: os mocks
// `practiceStatus`, `nextPedagogicalLesson`, `submitCard` e `ergonomic` estavam
// registrados em `deps` desde o início, e nenhuma requisição os alcançava. A
// cobertura vinha do `presentation/app.test.ts` Express, que foi removido — e o
// e2e, agora sobre o Nest, também não passa por elas.
//
// Um mock registrado e nunca exercitado é o mesmo tipo de mentira que a
// interface sem consumidor: parece cobertura no diff e não cobre nada.
// ---------------------------------------------------------------------------

const PROGRESS_CARD_BODY = {
  lessonId: LESSON_ID,
  insecureKeys: ["a"],
  discomfortReported: false,
  nextSessionNote: "continuar",
  currentBackspaceCount: 0,
};

describe("Nest - /me/pedagogical-lesson, /me/progress-card e /me/ergonomic-check", () => {
  it("GET /me/pedagogical-lesson → 200 e confirma o boolean, não a string", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/pedagogical-lesson")
      .query({ confirmsNoLookingAtKeyboard: "true" })
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    // A query chega como string; o caso de uso recebe boolean. Passar a string
    // adiante faria "false" ser truthy e a lição errada ser servida.
    expect(calls.nextPedagogicalLesson).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });
    await app.close();
  });

  it("GET /me/pedagogical-lesson com confirmsNoLookingAtKeyboard=false → false, não string", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/pedagogical-lesson")
      .query({ confirmsNoLookingAtKeyboard: "false" })
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(calls.nextPedagogicalLesson).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      confirmsNoLookingAtKeyboard: false,
    });
    await app.close();
  });

  it("GET /me/pedagogical-lesson sem o parâmetro → 422", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/pedagogical-lesson")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.nextPedagogicalLesson).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /me/progress-card → 201 e deriva o userId do JWT", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/progress-card")
      .set("Authorization", "Bearer valid")
      .send(PROGRESS_CARD_BODY);

    expect(res.status).toBe(201);
    expect(calls.submitCard).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USER_ID, lessonId: LESSON_ID }),
    );
    await app.close();
  });

  it("POST /me/progress-card sem lessonId → 422 e o caso de uso não roda", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/progress-card")
      .set("Authorization", "Bearer valid")
      .send({ ...PROGRESS_CARD_BODY, lessonId: undefined });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.submitCard).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /me/progress-card com userId no corpo → 422 (userId sempre do token)", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/progress-card")
      .set("Authorization", "Bearer valid")
      .send({ ...PROGRESS_CARD_BODY, userId: "outro-usuario" });

    // O schema é `.strict()`: o corpo não pode trazer `userId`. Sem isso, um
    // cliente poderia主張 ser outro usuário — o corpo viraria segunda fonte de
    // verdade, que é o que o PRD §13.1 proíbe.
    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.submitCard).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /me/progress-card com currentBackspaceCount negativo → 422", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/progress-card")
      .set("Authorization", "Bearer valid")
      .send({ ...PROGRESS_CARD_BODY, currentBackspaceCount: -1 });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.submitCard).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /me/ergonomic-check ok → 201", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer valid")
      .send({
        seatHeightOk: true,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(ERGONOMIC_FIXTURE);
    expect(calls.ergonomic).toHaveBeenCalledWith({
      seatHeightOk: true,
      lumbarSupportOk: true,
      monitorAtEyeLevel: true,
      wristSupportOk: true,
      discomfortReported: false,
    });
    await app.close();
  });

  it("POST /me/ergonomic-check com checks faltando → 422", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer valid")
      .send({ seatHeightOk: true, discomfortReported: false });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.ergonomic).not.toHaveBeenCalled();
    await app.close();
  });

  it("GET /me/practice-status → 200 e deriva o userId do JWT", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/me/practice-status")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(200);
    expect(calls.practiceStatus).toHaveBeenCalledWith(TEST_USER_ID);
    await app.close();
  });

  it("GET /me/practice-status sem token → 401 e o caso de uso não roda", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app)).get("/me/practice-status");

    expect(res.status).toBe(401);
    expect(calls.practiceStatus).not.toHaveBeenCalled();
    await app.close();
  });

  it("as rotas pedagógicas exigem token → 401 e nenhum caso de uso roda", async () => {
    const { app, calls } = await buildNestApp();

    const results = await Promise.all([
      request(httpServer(app)).get("/me/pedagogical-lesson"),
      request(httpServer(app))
        .post("/me/progress-card")
        .send(PROGRESS_CARD_BODY),
      request(httpServer(app)).post("/me/ergonomic-check").send({}),
    ]);

    for (const res of results) {
      expect(res.status).toBe(401);
    }
    expect(calls.nextPedagogicalLesson).not.toHaveBeenCalled();
    expect(calls.submitCard).not.toHaveBeenCalled();
    expect(calls.ergonomic).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("Nest - bordas do AuthGuard que a pilha Express cobria", () => {
  it("Authorization sem o prefixo Bearer → 401", async () => {
    const { app, calls } = await buildNestApp();
    // Um token **mais longo que 7 caracteres**, de proposito. O guard faz
    // `slice(7)` para descartar o prefixo, e um token curto (< 7) voltaria "" e
    // cairia na checagem de vazio — o 401 viria por acidente, nao porque o
    // prefixo foi exigido. Com um JWT de tamanho real, `slice(7)` deixa resto
    // nao vazio, e o header sem `Bearer` passaria a autenticar se a checagem de
    // prefixo nao existisse.
    const res = await request(httpServer(app))
      .get("/users/me")
      .set(
        "Authorization",
        "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.assinatura",
      );

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
    expect(calls.getUser).not.toHaveBeenCalled();
    await app.close();
  });

  it("Authorization com 'Bearer ' vazio → 401", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer ");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
    expect(calls.getUser).not.toHaveBeenCalled();
    await app.close();
  });

  it("token que o serviço rejeita → 401 e o caso de uso não roda", async () => {
    const { app, calls } = await buildNestApp();
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer boom");

    // O stub de `verifyAccessToken` lança um `Error` comum no token "boom" —
    // é o que o `jsonwebtoken` faz com um token corrompido. Um erro que não é
    // AppError tem de virar 401 genérico: escapar como 500 entregaria ao
    // cliente que o token é problema dele, e não credencial inválida.
    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
    expect(calls.getUser).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("Nest - mapeamento de erro do AppExceptionFilter (RNF02 + catálogo)", () => {
  it("DomainError do domínio → 403 com a mensagem do domínio, não a do catálogo", async () => {
    const { app } = await buildNestApp({
      [TOKENS.PAUSE_SESSION]: {
        execute: (): Promise<SessionCommandResponseDTO> =>
          Promise.reject(
            new SessionNotOwnedError("Sessão não pertence ao usuário"),
          ),
      },
    });
    const res = await request(httpServer(app))
      .post(`/sessions/${SESSION_ID}/pause`)
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(403);
    // A mensagem vem do DomainError. O catálogo é o fallback de quem chega sem
    // mensagem própria — usar o catálogo aqui descartaria o texto do domínio.
    expect(asErrorBody(res.body).error).toMatchObject({
      code: "SESSION_NOT_OWNED",
      message: "Sessão não pertence ao usuário",
    });
    await app.close();
  });

  it("RN17 - PROFILE_NOT_OWNED → 403", async () => {
    const { app } = await buildNestApp({
      [TOKENS.GET_USER]: {
        execute: (): Promise<GetUserResponseDTO> =>
          Promise.reject(
            new ProfileNotOwnedError("Perfil não pertence ao usuário"),
          ),
      },
    });
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(403);
    expect(asErrorBody(res.body).error.code).toBe("PROFILE_NOT_OWNED");
    await app.close();
  });

  it("USER_ALREADY_EXISTS → 409", async () => {
    const { app } = await buildNestApp({
      [TOKENS.REGISTER_USER]: {
        execute: (): Promise<{ userId: string }> =>
          Promise.reject(new UserAlreadyExistsError("E-mail já cadastrado")),
      },
    });
    const res = await request(httpServer(app))
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha-segura" });

    expect(res.status).toBe(409);
    expect(asErrorBody(res.body).error.code).toBe("USER_ALREADY_EXISTS");
    await app.close();
  });

  it("RN28 - DISCOMFORT_SIGNALED → 422", async () => {
    const { app } = await buildNestApp({
      [TOKENS.CHECK_ERGONOMIC_SAFETY]: {
        execute: (): Promise<CheckErgonomicSafetyResponseDTO> =>
          Promise.reject(new DiscomfortSignaledError("Desconforto relatado")),
      },
    });
    const res = await request(httpServer(app))
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer valid")
      .send({
        seatHeightOk: true,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: true,
        discomfortDetail: "pulsos",
      });

    // 422 e não 400: o corpo está válido, a regra de negócio é que recusa.
    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error).toMatchObject({
      code: "DISCOMFORT_SIGNALED",
      message: "Desconforto relatado",
    });
    await app.close();
  });

  it("erro inesperado → 500 INTERNAL sem vazar o detalhe interno", async () => {
    const { app } = await buildNestApp({
      [TOKENS.GET_USER]: {
        execute: (): Promise<GetUserResponseDTO> =>
          Promise.reject(new Error("postgres://admin:senha@host:5432/prod")),
      },
    });
    const res = await request(httpServer(app))
      .get("/users/me")
      .set("Authorization", "Bearer valid");

    expect(res.status).toBe(500);
    const body = asErrorBody(res.body);
    expect(body.error.code).toBe("INTERNAL");
    // A exceção pode carregar credencial de infraestrutura; a resposta HTTP não
    // pode repetir nada dela. O detalhe vai para o log do servidor, que é quem
    // pode ver a connection string.
    expect(JSON.stringify(body)).not.toContain("postgres://");
    expect(JSON.stringify(body)).not.toContain("senha");
    await app.close();
  });

  it("rota desconhecida → 404", async () => {
    const { app } = await buildNestApp();
    const res = await request(httpServer(app)).get("/nao-existe");

    expect(res.status).toBe(404);
    await app.close();
  });
});

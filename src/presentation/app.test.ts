import request from "supertest";
import { describe, expect, it, vi, type Mock } from "vitest";
import type { RequestHandler } from "express";
import type { AuthenticatedRequest } from "./middlewares/authMiddleware.js";
import { AppError } from "../shared/errors/AppError.js";
import { createApp, type AppDependencies } from "./app.js";
import { createRateLimitMiddleware } from "./middlewares/rateLimitMiddleware.js";
import { InMemoryRateLimiter } from "../infrastructure/rateLimit/InMemoryRateLimiter.js";
import {
  ProfileNotOwnedError,
  SessionNotOwnedError,
  UserAlreadyExistsError,
  DiscomfortSignaledError,
} from "../domain/errors/DomainError.js";
import type { LessonDTO } from "../domain/entities/Lesson.js";
import type { KeyPerformanceDTO } from "../domain/entities/KeyPerformance.js";
import type { SessionMetricsProps } from "../domain/entities/SessionMetrics.js";
import type { GetUserProgressResponseDTO } from "../application/dtos/ProgressDTOs.js";
import type { SessionCommandResponseDTO } from "../application/dtos/SessionDTOs.js";
import type { RefreshTokenResponseDTO } from "../application/dtos/RefreshTokenDTO.js";
import type {
  GetUserResponseDTO,
  UpdateUserLayoutResponseDTO,
} from "../application/dtos/UserDTOs.js";
import type {
  CheckErgonomicSafetyResponseDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardResponseDTO,
} from "../application/dtos/ProgressCardDTOs.js";
import type { PracticeStatusDTO } from "../application/dtos/PracticePacingDTOs.js";
import type { LessonPerformanceDTO } from "../application/dtos/LessonPerformanceDTOs.js";
import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from "../application/dtos/DashboardDTOs.js";

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

function stubAuth(): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res
        .status(401)
        .json(
          AppError.unauthorized(
            "UNAUTHORIZED",
            "Token de acesso não fornecido",
          ).toJSON(),
        );
      return;
    }
    (req as AuthenticatedRequest).userId = TEST_USER_ID;
    next();
  };
}

const allowAll: RequestHandler = (_req, _res, next) => {
  next();
};

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
  keyPerformance: Mock;
  nextPedagogicalLesson: Mock;
  submitCard: Mock;
  ergonomic: Mock;
  practiceStatus: Mock;
  lessonPerformance: Mock;
}

interface TestContext {
  app: ReturnType<typeof createApp>;
  calls: TestCalls;
}

function buildTestApp(overrides: Partial<AppDependencies> = {}): TestContext {
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
  const keyPerformance = vi.fn((): Promise<KeyPerformanceDTO[]> =>
    Promise.resolve([]),
  );
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

  const deps: AppDependencies = {
    authMiddleware: stubAuth(),
    loginRateLimiter: allowAll,
    refreshRateLimiter: allowAll,
    registerUser: { execute: register },
    login: { execute: login },
    refreshToken: { execute: refresh },
    getUser: { execute: getUser },
    updateUserLayout: { execute: updateLayout },
    listLessons: { execute: listLessons },
    getLesson: { execute: getLesson },
    startSession: { execute: startSession },
    pauseSession: { execute: pause },
    resumeSession: { execute: resume },
    abandonSession: { execute: abandon },
    submitSession: { execute: submit },
    getReinforcementLesson: { execute: reinforcement },
    getUserProgress: { execute: progress },
    getUserKeyPerformance: { execute: keyPerformance },
    getNextPedagogicalLesson: { execute: nextPedagogicalLesson },
    submitProgressCard: { execute: submitCard },
    checkErgonomicSafety: { execute: ergonomic },
    getPracticeStatus: { execute: practiceStatus },
    getLessonPerformance: { execute: lessonPerformance },
    getDashboardHabits: { execute: dashboardHabits },
    getDashboardMastery: { execute: dashboardMastery },
    getDashboardProximity: { execute: dashboardProximity },
    ...overrides,
  };

  return {
    app: createApp(deps),
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
      keyPerformance,
      nextPedagogicalLesson,
      submitCard,
      ergonomic,
      practiceStatus,
      lessonPerformance,
    },
  };
}

function asErrorBody(body: unknown): ErrorBody {
  return body as ErrorBody;
}

describe("RN16 - rotas protegidas exigem token (TASK-062)", () => {
  it("GET /users/me sem token → 401", async () => {
    const { app } = buildTestApp();
    const res = await request(app).get("/users/me");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
  });

  it("GET /lessons sem token → 401", async () => {
    const { app } = buildTestApp();
    const res = await request(app).get("/lessons");

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
  });

  it("POST /auth/register é público (sem token) → 201", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(201);
  });

  it("POST /auth/login é público → 200", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(200);
  });

  it("POST /auth/refresh é público → 200", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "token" });

    expect(res.status).toBe(200);
  });
});

describe("TASK-056 - POST /auth/register", () => {
  it("registro válido → 201 com userId", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: TEST_USER_ID });
    expect(calls.register).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@email.com",
      password: "senha123",
    });
  });

  it("email inválido → 422 VALIDATION_ERROR com mensagem pt-BR", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "nao-e-email", password: "senha123" });

    expect(res.status).toBe(422);
    const body = asErrorBody(res.body);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.issues[0]).toMatchObject({
      path: "email",
      message: "Email inválido",
    });
    expect(calls.register).not.toHaveBeenCalled();
  });

  it("senha muito curta → 422", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "abc" });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
  });

  it("nome vazio → 422 com mensagem própria", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "   ", email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.details?.issues[0]).toMatchObject({
      path: "name",
      message: "Nome é obrigatório",
    });
  });
});

describe("TASK-056 - POST /auth/login", () => {
  it("credenciais válidas → 200 com access e refresh token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(calls.login).toHaveBeenCalledWith({
      email: "ana@email.com",
      password: "senha123",
    });
  });
});

describe("TASK-073 - rate limiting de /auth/login e /auth/refresh (ADR-013)", () => {
  it("bloqueia com 429 TOO_MANY_REQUESTS após exceder o limite e não chama o use case", async () => {
    const loginRateLimiter = createRateLimitMiddleware(
      new InMemoryRateLimiter(),
      {
        keyPrefix: "login",
        maxAttempts: 2,
        windowMs: 60000,
      },
    );
    const { app, calls } = buildTestApp({ loginRateLimiter });

    await request(app)
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha123" });
    await request(app)
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha123" });
    const blocked = await request(app)
      .post("/auth/login")
      .send({ email: "ana@email.com", password: "senha123" });

    expect(blocked.status).toBe(429);
    expect(asErrorBody(blocked.body).error).toEqual({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas de login. Tente novamente mais tarde",
    });
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(calls.login).toHaveBeenCalledTimes(2);
  });

  it("NÃO limita /auth/register", async () => {
    const loginRateLimiter = createRateLimitMiddleware(
      new InMemoryRateLimiter(),
      {
        keyPrefix: "login",
        maxAttempts: 0,
        windowMs: 60000,
      },
    );
    const { app } = buildTestApp({ loginRateLimiter });

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(201);
  });

  it("limita /auth/refresh com política própria", async () => {
    const refreshRateLimiter = createRateLimitMiddleware(
      new InMemoryRateLimiter(),
      {
        keyPrefix: "refresh",
        maxAttempts: 0,
        windowMs: 60000,
      },
    );
    const { app, calls } = buildTestApp({ refreshRateLimiter });

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "token" });

    expect(res.status).toBe(429);
    expect(asErrorBody(res.body).error.code).toBe("TOO_MANY_REQUESTS");
    expect(calls.refresh).not.toHaveBeenCalled();
  });
});

describe("TASK-057 - GET /users/me", () => {
  it("devolve perfil do usuário autenticado", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: TEST_USER_ID, name: "Ana" });
    expect(calls.getUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_USER_ID);
  });
});

describe("TASK-057 - PATCH /users/me (layout)", () => {
  it("layout válido → 200 e userId sempre do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .patch("/users/me")
      .set("Authorization", "Bearer token")
      .send({ layout: "US-INTERNATIONAL" });

    expect(res.status).toBe(200);
    expect(calls.updateLayout).toHaveBeenCalledWith(TEST_USER_ID, {
      userId: TEST_USER_ID,
      layout: "US-INTERNATIONAL",
    });
  });

  it("layout desconhecido → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .patch("/users/me")
      .set("Authorization", "Bearer token")
      .send({ layout: "AZERTY" });

    expect(res.status).toBe(422);
    expect(calls.updateLayout).not.toHaveBeenCalled();
  });
});

describe("TASK-058 - GET /lessons", () => {
  it("lista lições sem filtros passando {}", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/lessons")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(calls.listLessons).toHaveBeenCalledWith(TEST_USER_ID, {});
  });

  it("repassa filtros de level, type e layout", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/lessons?level=3&type=PRACTICE&layout=ABNT2")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.listLessons).toHaveBeenCalledWith(TEST_USER_ID, {
      level: 3,
      type: "PRACTICE",
      layout: "ABNT2",
    });
  });

  it("level não numérico → 422", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .get("/lessons?level=abc")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("TASK-058 - GET /lessons/:id", () => {
  it("id válido → 200", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get(`/lessons/${LESSON_ID}`)
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.getLesson).toHaveBeenCalledWith(LESSON_ID);
  });

  it("id inválido → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/lessons/nao-uuid")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(calls.getLesson).not.toHaveBeenCalled();
  });
});

describe("TASK-059 - POST /sessions", () => {
  it("inicia sessão com lessonId e userId do token → 201", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/sessions")
      .set("Authorization", "Bearer token")
      .send({ lessonId: LESSON_ID });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sessionId: SESSION_ID, state: "RUNNING" });
    expect(calls.startSession).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      lessonId: LESSON_ID,
    });
  });

  it("PRD §13.1 - userId no corpo é rejeitado e nunca usado como fonte de verdade", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/sessions")
      .set("Authorization", "Bearer token")
      .send({ lessonId: LESSON_ID, userId: "hacker-id" });

    expect(res.status).toBe(422);
    expect(calls.startSession).not.toHaveBeenCalled();
  });
});

describe("TASK-059 - comandos de sessão", () => {
  it("pause/resume/abandon usam userId do token e sessionId da rota", async () => {
    const { app, calls } = buildTestApp();

    const pause = await request(app)
      .post(`/sessions/${SESSION_ID}/pause`)
      .set("Authorization", "Bearer token");
    expect(pause.status).toBe(200);
    expect(calls.pause).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      sessionId: SESSION_ID,
    });

    const resume = await request(app)
      .post(`/sessions/${SESSION_ID}/resume`)
      .set("Authorization", "Bearer token");
    expect(resume.status).toBe(200);
    expect(calls.resume).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      sessionId: SESSION_ID,
    });

    const abandon = await request(app)
      .post(`/sessions/${SESSION_ID}/abandon`)
      .set("Authorization", "Bearer token");
    expect(abandon.status).toBe(200);
    expect(calls.abandon).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      sessionId: SESSION_ID,
    });
  });

  it("sessionId de rota inválido → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/sessions/nao-uuid/pause")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(calls.pause).not.toHaveBeenCalled();
  });
});

describe("TASK-059 - POST /sessions/:id/submit", () => {
  it("submete eventos normalizando campos opcionais para null", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer token")
      .send({
        keystrokes: [
          {
            expectedKey: "a",
            physicalKey: "KeyA",
            logicalKey: "a",
            eventType: "INCORRECT",
            timestampMs: 200,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      sessionId: SESSION_ID,
      state: "COMPLETED",
    });
    expect(calls.submit).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      sessionId: SESSION_ID,
      keystrokes: [
        {
          expectedKey: "a",
          typedKey: null,
          physicalKey: "KeyA",
          logicalKey: "a",
          eventType: "INCORRECT",
          timestampMs: 200,
          latencyMs: null,
          composedCharacter: null,
        },
      ],
    });
  });

  it("keystroke com eventType inválido → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer token")
      .send({
        keystrokes: [
          {
            expectedKey: "a",
            physicalKey: "KeyA",
            logicalKey: "a",
            eventType: "DELEGATE",
            timestampMs: 100,
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(calls.submit).not.toHaveBeenCalled();
  });

  it("DEAD_KEY_COMPOSE com expectedKey vazio é aceito (TASK-084 no HTTP)", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer token")
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
            timestampMs: 1100,
            latencyMs: 50,
            composedCharacter: "á",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(calls.submit).toHaveBeenCalledOnce();
  });

  it("expectedKey vazio em evento digitado ainda é rejeitado → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer token")
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
    expect(calls.submit).not.toHaveBeenCalled();
  });
});

describe("TASK-060/061 - /me/reinforcement-lesson e /me/progress", () => {
  it("GET /me/reinforcement-lesson → 200 com userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/reinforcement-lesson")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.reinforcement).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("GET /me/progress → 200 com userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/progress")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.progress).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("RN25 - GET /me/key-performance → 200 com userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/key-performance")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.keyPerformance).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("RN33 - GET /me/practice-status → 200 com userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/practice-status")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.practiceStatus).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("RN32 - GET /me/lessons/performance → 200 com userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/lessons/performance")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(calls.lessonPerformance).toHaveBeenCalledWith(TEST_USER_ID);
  });
});

describe("TASK-062 - rotas pedagógicas /me/*", () => {
  it("GET /me/pedagogical-lesson → 200 e repassa confirmsNoLookingAtKeyboard como boolean", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/pedagogical-lesson?confirmsNoLookingAtKeyboard=true")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      reason: "advance",
      shouldVaryExercise: false,
    });
    expect(calls.nextPedagogicalLesson).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      confirmsNoLookingAtKeyboard: true,
    });
  });

  it("GET /me/pedagogical-lesson sem parâmetro → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .get("/me/pedagogical-lesson")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error.code).toBe("VALIDATION_ERROR");
    expect(calls.nextPedagogicalLesson).not.toHaveBeenCalled();
  });

  it("POST /me/progress-card → 201 com cartão e userId do token", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/me/progress-card")
      .set("Authorization", "Bearer token")
      .send({
        insecureKeys: ["a"],
        discomfortReported: false,
        nextSessionNote: "Lição 1 concluída",
        currentBackspaceCount: 2,
      });

    expect(res.status).toBe(201);
    const body = res.body as { progressCard: { phase: string } };
    expect(body.progressCard.phase).toBe("ERGONOMICS_SETUP");
    expect(calls.submitCard).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      insecureKeys: ["a"],
      discomfortReported: false,
      nextSessionNote: "Lição 1 concluída",
      currentBackspaceCount: 2,
    });
  });

  it("POST /me/progress-card com userId no corpo → 422 (userId sempre do token)", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/me/progress-card")
      .set("Authorization", "Bearer token")
      .send({
        userId: "hacker-id",
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: "nota",
        currentBackspaceCount: 1,
      });

    expect(res.status).toBe(422);
    expect(calls.submitCard).not.toHaveBeenCalled();
  });

  it("POST /me/progress-card com backspaceCount negativo → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/me/progress-card")
      .set("Authorization", "Bearer token")
      .send({
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: "nota",
        currentBackspaceCount: -1,
      });

    expect(res.status).toBe(422);
    expect(calls.submitCard).not.toHaveBeenCalled();
  });

  it("POST /me/ergonomic-check ok → 201 safe true", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer token")
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
  });

  it("POST /me/ergonomic-check com checks faltando → 422", async () => {
    const { app, calls } = buildTestApp();
    const res = await request(app)
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer token")
      .send({ seatHeightOk: true });

    expect(res.status).toBe(422);
    expect(calls.ergonomic).not.toHaveBeenCalled();
  });

  it("RN28 - POST /me/ergonomic-check com desconforto → 422 DISCOMFORT_SIGNALED pt-BR (TASK-071)", async () => {
    const { app } = buildTestApp({
      checkErgonomicSafety: {
        execute: vi.fn((): Promise<never> => {
          throw new DiscomfortSignaledError(
            "Desconforto sinalizado: interrompa o treino imediatamente, faça uma pausa, alongue e hidrate-se antes de retomar",
          );
        }),
      },
    });
    const res = await request(app)
      .post("/me/ergonomic-check")
      .set("Authorization", "Bearer token")
      .send({
        seatHeightOk: true,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: true,
        discomfortDetail: "Dor no pulso",
      });

    expect(res.status).toBe(422);
    expect(asErrorBody(res.body).error).toEqual({
      code: "DISCOMFORT_SIGNALED",
      message:
        "Desconforto sinalizado: interrompa o treino imediatamente, faça uma pausa, alongue e hidrate-se antes de retomar",
    });
  });

  it("rotas pedagógicas exigem token → 401", async () => {
    const { app } = buildTestApp();
    const res = await request(app).get(
      "/me/pedagogical-lesson?confirmsNoLookingAtKeyboard=true",
    );

    expect(res.status).toBe(401);
    expect(asErrorBody(res.body).error.code).toBe("UNAUTHORIZED");
  });
});

describe("RNF02 + catálogo (TASK-072) - formato de erro padronizado", () => {
  it("DomainError SESSION_NOT_OWNED → 403 com mensagem do catálogo", async () => {
    const { app } = buildTestApp({
      submitSession: {
        execute: vi.fn((): Promise<never> => {
          throw new SessionNotOwnedError(
            "Sessão não pertence ao usuário autenticado",
          );
        }),
      },
    });
    const res = await request(app)
      .post(`/sessions/${SESSION_ID}/submit`)
      .set("Authorization", "Bearer token")
      .send({ keystrokes: [] });

    expect(res.status).toBe(403);
    expect(asErrorBody(res.body).error).toEqual({
      code: "SESSION_NOT_OWNED",
      message: "Sessão não pertence ao usuário autenticado",
    });
  });

  it("RN17 - perfil de outro usuário → 403 PROFILE_NOT_OWNED", async () => {
    const { app } = buildTestApp({
      getUser: {
        execute: vi.fn((): Promise<never> => {
          throw new ProfileNotOwnedError(
            "Perfil não pertence ao usuário autenticado",
          );
        }),
      },
    });
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(403);
    expect(asErrorBody(res.body).error.code).toBe("PROFILE_NOT_OWNED");
  });

  it("USER_ALREADY_EXISTS → 409", async () => {
    const { app } = buildTestApp({
      registerUser: {
        execute: vi.fn((): Promise<never> => {
          throw new UserAlreadyExistsError("Usuário com este email já existe");
        }),
      },
    });
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana", email: "ana@email.com", password: "senha123" });

    expect(res.status).toBe(409);
    expect(asErrorBody(res.body).error).toEqual({
      code: "USER_ALREADY_EXISTS",
      message: "Usuário com este email já existe",
    });
  });

  it("erro inesperado → 500 INTERNAL sem vazar detalhes", async () => {
    const { app } = buildTestApp({
      getUserProgress: {
        execute: vi.fn((): Promise<never> => {
          throw new Error("stack secreta do banco");
        }),
      },
    });
    const res = await request(app)
      .get("/me/progress")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(500);
    expect(asErrorBody(res.body).error).toEqual({
      code: "INTERNAL",
      message: "Erro interno do servidor",
    });
  });

  it("rota desconhecida → 404 NOT_FOUND", async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .get("/nao-existe")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
    expect(asErrorBody(res.body).error).toEqual({
      code: "NOT_FOUND",
      message: "Rota não encontrada",
    });
  });
});

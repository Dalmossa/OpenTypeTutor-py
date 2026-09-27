import request from "supertest";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "../infrastructure/database/testing.js";
import { rateLimitParams } from "../infrastructure/auth/rateLimitParams.js";
import { TypeOrmLessonRepository } from "../infrastructure/repositories/TypeOrmLessonRepository.js";
import { createNestApp } from "../nestRuntime.js";
import { Lesson } from "../domain/entities/Lesson.js";
import { Layout } from "../domain/value-objects/Layout.js";
import { SessionId } from "../domain/value-objects/SessionId.js";

const LESSON_ID = "1f0a1f2b-cbd0-4c8a-9f45-3d3b1c2f4e5a";
const KEYS = ["a", "s", "d", "f", "g", "h"];

const KEYSTROKES = [
  {
    expectedKey: "a",
    physicalKey: "KeyA",
    logicalKey: "a",
    eventType: "CORRECT",
    timestampMs: 100,
    latencyMs: 120,
  },
  {
    expectedKey: "s",
    physicalKey: "KeyS",
    logicalKey: "s",
    eventType: "CORRECT",
    timestampMs: 250,
    latencyMs: 110,
  },
  {
    expectedKey: "d",
    typedKey: "f",
    physicalKey: "KeyD",
    logicalKey: "d",
    eventType: "INCORRECT",
    timestampMs: 400,
    latencyMs: 140,
  },
  {
    expectedKey: "d",
    physicalKey: "KeyD",
    logicalKey: "d",
    eventType: "CORRECTION",
    timestampMs: 550,
  },
  {
    expectedKey: "f",
    physicalKey: "KeyF",
    logicalKey: "f",
    eventType: "CORRECT",
    timestampMs: 700,
    latencyMs: 130,
  },
  {
    expectedKey: "g",
    physicalKey: "KeyG",
    logicalKey: "g",
    eventType: "CORRECT",
    timestampMs: 850,
    latencyMs: 120,
  },
  {
    expectedKey: "h",
    physicalKey: "KeyH",
    logicalKey: "h",
    eventType: "CORRECT",
    timestampMs: 1000,
    latencyMs: 125,
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface TokensBody {
  accessToken: string;
  refreshToken: string;
}

interface SubmitBody {
  sessionId: string;
  state: string;
  metrics: {
    charactersTyped: number;
    correctCharacters: number;
    incorrectCharacters: number;
    correctedErrors: number;
    finalUncorrectedErrors: number;
    accuracy: number;
    activeDurationMs: number;
    grossWpm: number;
  };
}

interface StartSessionBody {
  sessionId: string;
  state: string;
}

function errorCode(res: { body: unknown }): string {
  return (res.body as { error: { code: string } }).error.code;
}

describe("Fase 7 - fluxo completo HTTP→Controller→Use Case→Domain→Repository→Database (TASK-063)", () => {
  let dataSource: DataSource;
  let httpServer: Server;
  let app: Awaited<ReturnType<typeof createNestApp>>;

  let accessToken = "";
  let refreshToken = "";
  let sessionId = "";
  let firstSubmitBody: Record<string, unknown> = {};

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    const lessonRepository = new TypeOrmLessonRepository(dataSource);
    await lessonRepository.save(
      Lesson.create({
        id: SessionId.create(LESSON_ID),
        level: 1,
        title: "Introdução à linha inicial",
        content: "asdf jkl;",
        targetKeys: KEYS,
        difficulty: "GUIDED",
        type: "INTRODUCTION",
        layout: Layout.create("ABNT2"),
      }),
    );

    // ADR-024: o e2e monta o app pelo mesmo `createNestApp` do runtime, em vez
    // de ter a sua propria copia do grafo de dependencias. Antes desta mudanca
    // o e2e rodava sobre o Express -- ou seja, nao exercitava o app que sobe em
    // producao. Era por isso que 6 rotas podiam responder 404 no Nest com o e2e
    // inteiro verde: o e2e nunca passou por elas.
    app = await createNestApp(dataSource);
    // `getHttpServer()` ja e `Server` no Nest — a anotacao da variavel carrega
    // o tipo, o cast seria ruido.
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  it("registro → login → perfil → lições → sessão → digitação → submit → progresso → reforço", async () => {
    const registration = await request(httpServer).post("/auth/register").send({
      name: "Ana",
      email: "ana.fase7@email.com",
      password: "senha-segura-123",
    });

    expect(registration.status).toBe(201);
    expect(registration.body).toHaveProperty("userId");

    const login = await request(httpServer).post("/auth/login").send({
      email: "ana.fase7@email.com",
      password: "senha-segura-123",
    });

    expect(login.status).toBe(200);
    const tokens = login.body as TokensBody;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const profile = await request(httpServer)
      .get("/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      name: "Ana",
      email: "ana.fase7@email.com",
    });
    expect(profile.body).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(profile.body)).not.toContain("passwordHash");

    const lessons = await request(httpServer)
      .get("/lessons?level=1")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(lessons.status).toBe(200);
    const lessonList = lessons.body as Array<{ id: string; layout: string }>;
    expect(lessonList.length).toBeGreaterThanOrEqual(1);
    const lesson = lessonList[0];
    expect(lesson).toMatchObject({ id: LESSON_ID, layout: "ABNT2" });

    const start = await request(httpServer)
      .post("/sessions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ lessonId: LESSON_ID });

    expect(start.status).toBe(201);
    const started = start.body as StartSessionBody;
    expect(started.state).toBe("RUNNING");
    sessionId = started.sessionId;

    await sleep(3100);

    const submit = await request(httpServer)
      .post(`/sessions/${sessionId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(submit.status).toBe(200);
    const submitBody = submit.body as SubmitBody;
    expect(submitBody).toMatchObject({
      sessionId,
      state: "COMPLETED",
      metrics: {
        charactersTyped: 6,
        correctCharacters: 5,
        incorrectCharacters: 1,
        correctedErrors: 1,
        finalUncorrectedErrors: 0,
      },
    });
    expect(submitBody.metrics.accuracy).toBeCloseTo(5 / 6);
    expect(submitBody.metrics.activeDurationMs).toBeGreaterThanOrEqual(3000);
    expect(submitBody.metrics.grossWpm).toBeGreaterThanOrEqual(0);
    firstSubmitBody = submit.body as Record<string, unknown>;

    const resubmit = await request(httpServer)
      .post(`/sessions/${sessionId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(resubmit.status).toBe(200);
    expect(resubmit.body).toEqual(firstSubmitBody);

    const progress = await request(httpServer)
      .get("/me/progress")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(progress.status).toBe(200);
    expect(progress.body).toMatchObject({
      currentLevel: 1,
      completedLessons: 1,
    });

    const reinforcement = await request(httpServer)
      .get("/me/reinforcement-lesson")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(reinforcement.status).toBe(200);
    const reinforcementBody = reinforcement.body as {
      type: string;
      difficulty: string;
      level: number;
      layout: string;
      targetKeys: string[];
    };
    expect(reinforcementBody).toMatchObject({
      type: "REINFORCEMENT",
      difficulty: "REINFORCEMENT",
      level: 1,
      layout: "ABNT2",
    });
    expect(reinforcementBody.targetKeys.length).toBeGreaterThan(0);
  });

  it("refresh token rotaciona e o novo access token segue autenticando (RNF08)", async () => {
    const refresh = await request(httpServer)
      .post("/auth/refresh")
      .send({ refreshToken });

    expect(refresh.status).toBe(200);
    const freshTokens = refresh.body as TokensBody;
    expect(freshTokens.accessToken).toBeTruthy();

    const newAccessToken = freshTokens.accessToken;
    const me = await request(httpServer)
      .get("/users/me")
      .set("Authorization", `Bearer ${newAccessToken}`);

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: "ana.fase7@email.com" });
  });

  it("RN16 - rota autenticada sem token → 401 (middleware real)", async () => {
    const res = await request(httpServer).get("/users/me");

    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe("UNAUTHORIZED");
  });

  it("RN17 - sessão alheia não pode ser submetida (E2E com dois usuários)", async () => {
    const secondRegistration = await request(httpServer)
      .post("/auth/register")
      .send({
        name: "Bruno",
        email: "bruno.fase7@email.com",
        password: "outra-senha-456",
      });

    expect(secondRegistration.status).toBe(201);

    const secondLogin = await request(httpServer).post("/auth/login").send({
      email: "bruno.fase7@email.com",
      password: "outra-senha-456",
    });

    expect(secondLogin.status).toBe(200);
    const secondTokens = secondLogin.body as TokensBody;
    const secondToken = secondTokens.accessToken;

    const submitAlien = await request(httpServer)
      .post(`/sessions/${sessionId}/submit`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(submitAlien.status).toBe(403);
    expect(errorCode(submitAlien)).toBe("SESSION_NOT_OWNED");
  });
});

// ---------------------------------------------------------------------------
// Wiring do rate limit (ADR-013 / ADR-024).
//
// O `rateLimitMiddleware.test.ts` prova a *lógica* do limitador com clocks
// injetados. O que ele não pode provar é que o limitador está **montado**, e
// em quais rotas, com qual política — o middleware é registrado em
// `createNestApp`, não por decorator, então remover a linha de registro produz
// um app que responde 200 indefinidamente sem falhar um único teste de unidade.
//
// Este bloco é o que pega isso, porque monta o app pelo mesmo `createNestApp`
// do runtime. Estava no `presentation/app.test.ts` Express antes do ADR-024.
// ---------------------------------------------------------------------------

describe("ADR-013/ADR-024 - o rate limit está montado no app de runtime", () => {
  // O limitador é um `InMemoryRateLimiter` criado **por app**, e a chave
  // compõe política + IP — supertest sempre usa 127.0.0.1. Compartilhar o app
  // com o describe de cima faria o orçamento de login ser consumido em ordens
  // diferentes conforme o teste que roda primeiro, o que é a forma mais fácil de
  // ter um teste de rate limit que passa por acidente. Por isso cada teste
  // daqui sobe o seu app.
  let rateDataSource: DataSource;
  const opened: Array<Awaited<ReturnType<typeof createNestApp>>> = [];

  async function isolatedServer(): Promise<Server> {
    const isolated = await createNestApp(rateDataSource);
    opened.push(isolated);
    return isolated.getHttpServer();
  }

  beforeAll(async () => {
    rateDataSource = await createTestDataSource();
  });

  afterAll(async () => {
    for (const app of opened) {
      await app.close();
    }
    await rateDataSource.destroy();
  });

  it("bloqueia /auth/login com 429 depois de 10 tentativas, sem alcançar o caso de uso", async () => {
    const server = await isolatedServer();
    const email = "rate-login@email.com";

    for (
      let attempt = 0;
      attempt < rateLimitParams.LOGIN_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const res = await request(server)
        .post("/auth/login")
        .send({ email, password: "errada-123" });
      // 401 = credencial recusada pelo caso de uso, ou seja, o limitador deixou
      // passar. Se algum desses vier 429, o limite é menor do que o parametro
      // diz e o teste seguinte não vai estar medindo a janela certa.
      expect([401, 429]).toContain(res.status);
      if (res.status === 429) {
        break;
      }
    }

    const blocked = await request(server)
      .post("/auth/login")
      .send({ email, password: "errada-123" });

    expect(blocked.status).toBe(429);
    expect(errorCode(blocked)).toBe("TOO_MANY_REQUESTS");
    // O limitador tem de responder **antes** do caso de uso: mesmo com a senha
    // certa, quem está bloqueado não entra. E o `Retry-After` diz quando.
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("não limita /auth/register — cadastro em massa é barrado por outro meio", async () => {
    const server = await isolatedServer();

    for (
      let attempt = 0;
      attempt < rateLimitParams.LOGIN_MAX_ATTEMPTS + 2;
      attempt += 1
    ) {
      const res = await request(server)
        .post("/auth/register")
        .send({
          name: `Carga ${String(attempt)}`,
          email: `carga-${String(attempt)}@email.com`,
          password: "senha-segura",
        });

      // Limitar o cadastro traria o efeito colateral de bloquear o usuário
      // legítimo que monta a conta dele, e nao o abuso. Por isso o limite fica
      // so no login (onde ha tentativa de credencial).
      expect(res.status).not.toBe(429);
      expect(res.status).toBe(201);
    }
  });

  it("/auth/refresh tem politica propria: mais folgada que a do login", async () => {
    const server = await isolatedServer();
    const email = "rate-refresh@email.com";

    const registered = await request(server)
      .post("/auth/register")
      .send({ name: "Refresh", email, password: "senha-segura" });
    expect(registered.status).toBe(201);

    const loggedIn = await request(server)
      .post("/auth/login")
      .send({ email, password: "senha-segura" });
    expect(loggedIn.status).toBe(200);

    // O limite do refresh e maior que o do login: renovar token e o caminho
    // normal de uma sessao longa, e travar ali derrubaria usuario legitimo.
    expect(rateLimitParams.REFRESH_MAX_ATTEMPTS).toBeGreaterThan(
      rateLimitParams.LOGIN_MAX_ATTEMPTS,
    );

    // O token tem de ser reencadeado a cada uso (RNF08 rotaciona e revoga o
    // anterior), como um cliente real faz. Reusar o mesmo daria 401 e o teste
    // mediria a rotacao, nao a politica de rate limit.
    let current = (loggedIn.body as TokensBody).refreshToken;
    for (
      let attempt = 0;
      attempt < rateLimitParams.LOGIN_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const res = await request(server)
        .post("/auth/refresh")
        .send({ refreshToken: current });

      // Passadas as 10, que e o orcamento do LOGIN, o refresh ainda tem folga.
      // Se as politicas estivessem trocadas, aqui viria 429.
      expect(res.status).toBe(200);
      current = (res.body as TokensBody).refreshToken;
    }

    const afterLoginBudget = await request(server)
      .post("/auth/refresh")
      .send({ refreshToken: current });
    expect(afterLoginBudget.status).toBe(200);
  });
});

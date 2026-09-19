import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../infrastructure/database/testing.js';
import { TypeOrmUserRepository } from '../infrastructure/repositories/TypeOrmUserRepository.js';
import { TypeOrmUserProfileRepository } from '../infrastructure/repositories/TypeOrmUserProfileRepository.js';
import { TypeOrmLessonRepository } from '../infrastructure/repositories/TypeOrmLessonRepository.js';
import { TypeOrmTypingSessionRepository } from '../infrastructure/repositories/TypeOrmTypingSessionRepository.js';
import { TypeOrmKeyPerformanceRepository } from '../infrastructure/repositories/TypeOrmKeyPerformanceRepository.js';
import { TypeOrmProgressRepository } from '../infrastructure/repositories/TypeOrmProgressRepository.js';
import { TypeOrmProgressCardRepository } from '../infrastructure/repositories/TypeOrmProgressCardRepository.js';
import { TypeOrmPracticePacingRepository } from '../infrastructure/repositories/TypeOrmPracticePacingRepository.js';
import { TypeOrmDailyMetricsAggregateRepository } from '../infrastructure/repositories/TypeOrmDailyMetricsAggregateRepository.js';
import { InMemoryNGramRepository } from '../infrastructure/repositories/InMemoryNGramRepository.js';
import { BcryptPasswordHasher } from '../infrastructure/auth/BcryptPasswordHasher.js';
import { AuthPasswordValidator } from '../infrastructure/auth/AuthPasswordValidator.js';
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService.js';
import { rateLimitParams } from '../infrastructure/auth/rateLimitParams.js';
import { InMemoryRateLimiter } from '../infrastructure/rateLimit/InMemoryRateLimiter.js';
import { createAuthMiddleware } from '../presentation/middlewares/authMiddleware.js';
import { createRateLimitMiddleware } from '../presentation/middlewares/rateLimitMiddleware.js';
import { createApp, type AppDependencies } from '../presentation/app.js';
import { RegisterUser } from '../application/use-cases/RegisterUser.js';
import { Login } from '../application/use-cases/Login.js';
import { RefreshToken } from '../application/use-cases/RefreshToken.js';
import { GetUser } from '../application/use-cases/GetUser.js';
import { UpdateUserLayout } from '../application/use-cases/UpdateUserLayout.js';
import { ListLessons } from '../application/use-cases/ListLessons.js';
import { GetLesson } from '../application/use-cases/GetLesson.js';
import { StartTypingSession } from '../application/use-cases/StartTypingSession.js';
import { PauseTypingSession } from '../application/use-cases/PauseTypingSession.js';
import { ResumeTypingSession } from '../application/use-cases/ResumeTypingSession.js';
import { AbandonTypingSession } from '../application/use-cases/AbandonTypingSession.js';
import { SubmitTypingSession } from '../application/use-cases/SubmitTypingSession.js';
import { GetReinforcementLesson } from '../application/use-cases/GetReinforcementLesson.js';
import { GetUserProgress } from '../application/use-cases/GetUserProgress.js';
import { GetUserKeyPerformance } from '../application/use-cases/GetUserKeyPerformance.js';
import { CheckErgonomicSafety } from '../application/use-cases/CheckErgonomicSafety.js';
import { GetNextPedagogicalLesson } from '../application/use-cases/GetNextPedagogicalLesson.js';
import { SubmitProgressCard } from '../application/use-cases/SubmitProgressCard.js';
import { GetPracticeStatus } from '../application/use-cases/GetPracticeStatus.js';
import { GetLessonPerformance } from '../application/use-cases/GetLessonPerformance.js';
import { Lesson } from '../domain/entities/Lesson.js';
import { Layout } from '../domain/value-objects/Layout.js';
import { SessionId } from '../domain/value-objects/SessionId.js';

const LESSON_ID = '1f0a1f2b-cbd0-4c8a-9f45-3d3b1c2f4e5a';
const KEYS = ['a', 's', 'd', 'f', 'g', 'h'];

const KEYSTROKES = [
  {
    expectedKey: 'a',
    physicalKey: 'KeyA',
    logicalKey: 'a',
    eventType: 'CORRECT',
    timestampMs: 100,
    latencyMs: 120,
  },
  {
    expectedKey: 's',
    physicalKey: 'KeyS',
    logicalKey: 's',
    eventType: 'CORRECT',
    timestampMs: 250,
    latencyMs: 110,
  },
  {
    expectedKey: 'd',
    typedKey: 'f',
    physicalKey: 'KeyD',
    logicalKey: 'd',
    eventType: 'INCORRECT',
    timestampMs: 400,
    latencyMs: 140,
  },
  {
    expectedKey: 'd',
    physicalKey: 'KeyD',
    logicalKey: 'd',
    eventType: 'CORRECTION',
    timestampMs: 550,
  },
  {
    expectedKey: 'f',
    physicalKey: 'KeyF',
    logicalKey: 'f',
    eventType: 'CORRECT',
    timestampMs: 700,
    latencyMs: 130,
  },
  {
    expectedKey: 'g',
    physicalKey: 'KeyG',
    logicalKey: 'g',
    eventType: 'CORRECT',
    timestampMs: 850,
    latencyMs: 120,
  },
  {
    expectedKey: 'h',
    physicalKey: 'KeyH',
    logicalKey: 'h',
    eventType: 'CORRECT',
    timestampMs: 1000,
    latencyMs: 125,
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
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

describe('Fase 7 - fluxo completo HTTP→Controller→Use Case→Domain→Repository→Database (TASK-063)', () => {
  let dataSource: DataSource;
  let app: ReturnType<typeof createApp>;

  let accessToken = '';
  let refreshToken = '';
  let sessionId = '';
  let firstSubmitBody: Record<string, unknown> = {};

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    const lessonRepository = new TypeOrmLessonRepository(dataSource);
    await lessonRepository.save(
      Lesson.create({
        id: SessionId.create(LESSON_ID),
        level: 1,
        title: 'Introdução à linha inicial',
        content: 'asdf jkl;',
        targetKeys: KEYS,
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: Layout.create('ABNT2'),
      })
    );

    const userRepository = new TypeOrmUserRepository(dataSource);
    const userProfileRepository = new TypeOrmUserProfileRepository(dataSource);
    const sessionRepository = new TypeOrmTypingSessionRepository(dataSource);
    const keyPerformanceRepository = new TypeOrmKeyPerformanceRepository(dataSource);
    const progressRepository = new TypeOrmProgressRepository(dataSource);
    const progressCardRepository = new TypeOrmProgressCardRepository(dataSource);
    const pacingRepository = new TypeOrmPracticePacingRepository(dataSource);
    const dailyAggregateRepository = new TypeOrmDailyMetricsAggregateRepository(dataSource);
    const passwordHasher = new BcryptPasswordHasher();
    const passwordValidator = new AuthPasswordValidator();
    const tokenService = new JwtTokenService();
    const nGramRepository = new InMemoryNGramRepository();

    const rateLimiter = new InMemoryRateLimiter();
    const loginRateLimiter = createRateLimitMiddleware(rateLimiter, {
      keyPrefix: 'login',
      maxAttempts: rateLimitParams.LOGIN_MAX_ATTEMPTS,
      windowMs: rateLimitParams.LOGIN_WINDOW_MS,
    });
    const refreshRateLimiter = createRateLimitMiddleware(rateLimiter, {
      keyPrefix: 'refresh',
      maxAttempts: rateLimitParams.REFRESH_MAX_ATTEMPTS,
      windowMs: rateLimitParams.REFRESH_WINDOW_MS,
    });

    const deps: AppDependencies = {
      authMiddleware: createAuthMiddleware(tokenService),
      loginRateLimiter,
      refreshRateLimiter,
      registerUser: new RegisterUser(userRepository, passwordHasher, passwordValidator),
      login: new Login(userRepository, passwordHasher, tokenService),
      refreshToken: new RefreshToken(tokenService),
      getUser: new GetUser(userRepository, userProfileRepository),
      updateUserLayout: new UpdateUserLayout(userProfileRepository),
      listLessons: new ListLessons(lessonRepository, userProfileRepository),
      getLesson: new GetLesson(lessonRepository),
      startSession: new StartTypingSession(sessionRepository, lessonRepository, userProfileRepository, pacingRepository),
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
        userProfileRepository
      ),
      getReinforcementLesson: new GetReinforcementLesson(
        userProfileRepository,
        keyPerformanceRepository,
        nGramRepository
      ),
      getUserProgress: new GetUserProgress(progressRepository, lessonRepository),
      getUserKeyPerformance: new GetUserKeyPerformance(userProfileRepository, keyPerformanceRepository),
      getNextPedagogicalLesson: new GetNextPedagogicalLesson(progressCardRepository, lessonRepository),
      submitProgressCard: new SubmitProgressCard(progressCardRepository, lessonRepository),
      checkErgonomicSafety: new CheckErgonomicSafety(),
      getPracticeStatus: new GetPracticeStatus(pacingRepository),
      getLessonPerformance: new GetLessonPerformance(sessionRepository),
    };

    app = createApp(deps);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('registro → login → perfil → lições → sessão → digitação → submit → progresso → reforço', async () => {
    const registration = await request(app).post('/auth/register').send({
      name: 'Ana',
      email: 'ana.fase7@email.com',
      password: 'senha-segura-123',
    });

    expect(registration.status).toBe(201);
    expect(registration.body).toHaveProperty('userId');

    const login = await request(app).post('/auth/login').send({
      email: 'ana.fase7@email.com',
      password: 'senha-segura-123',
    });

    expect(login.status).toBe(200);
    const tokens = login.body as TokensBody;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const profile = await request(app).get('/users/me').set('Authorization', `Bearer ${accessToken}`);

    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({ name: 'Ana', email: 'ana.fase7@email.com' });
    expect(profile.body).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(profile.body)).not.toContain('passwordHash');

    const lessons = await request(app).get('/lessons?level=1').set('Authorization', `Bearer ${accessToken}`);

    expect(lessons.status).toBe(200);
    const lessonList = lessons.body as Array<{ id: string; layout: string }>;
    expect(lessonList.length).toBeGreaterThanOrEqual(1);
    const lesson = lessonList[0];
    expect(lesson).toMatchObject({ id: LESSON_ID, layout: 'ABNT2' });

    const start = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lessonId: LESSON_ID });

    expect(start.status).toBe(201);
    const started = start.body as StartSessionBody;
    expect(started.state).toBe('RUNNING');
    sessionId = started.sessionId;

    await sleep(3100);

    const submit = await request(app)
      .post(`/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(submit.status).toBe(200);
    const submitBody = submit.body as SubmitBody;
    expect(submitBody).toMatchObject({
      sessionId,
      state: 'COMPLETED',
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

    const resubmit = await request(app)
      .post(`/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(resubmit.status).toBe(200);
    expect(resubmit.body).toEqual(firstSubmitBody);

    const progress = await request(app).get('/me/progress').set('Authorization', `Bearer ${accessToken}`);

    expect(progress.status).toBe(200);
    expect(progress.body).toMatchObject({ currentLevel: 1, completedLessons: 1 });

    const reinforcement = await request(app)
      .get('/me/reinforcement-lesson')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(reinforcement.status).toBe(200);
    const reinforcementBody = reinforcement.body as {
      type: string;
      difficulty: string;
      level: number;
      layout: string;
      targetKeys: string[];
    };
    expect(reinforcementBody).toMatchObject({
      type: 'REINFORCEMENT',
      difficulty: 'REINFORCEMENT',
      level: 1,
      layout: 'ABNT2',
    });
    expect(reinforcementBody.targetKeys.length).toBeGreaterThan(0);
  });

  it('refresh token rotaciona e o novo access token segue autenticando (RNF08)', async () => {
    const refresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(refresh.status).toBe(200);
    const freshTokens = refresh.body as TokensBody;
    expect(freshTokens.accessToken).toBeTruthy();

    const newAccessToken = freshTokens.accessToken;
    const me = await request(app).get('/users/me').set('Authorization', `Bearer ${newAccessToken}`);

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'ana.fase7@email.com' });
  });

  it('RN16 - rota autenticada sem token → 401 (middleware real)', async () => {
    const res = await request(app).get('/users/me');

    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe('UNAUTHORIZED');
  });

  it('RN17 - sessão alheia não pode ser submetida (E2E com dois usuários)', async () => {
    const secondRegistration = await request(app).post('/auth/register').send({
      name: 'Bruno',
      email: 'bruno.fase7@email.com',
      password: 'outra-senha-456',
    });

    expect(secondRegistration.status).toBe(201);

    const secondLogin = await request(app).post('/auth/login').send({
      email: 'bruno.fase7@email.com',
      password: 'outra-senha-456',
    });

    expect(secondLogin.status).toBe(200);
    const secondTokens = secondLogin.body as TokensBody;
    const secondToken = secondTokens.accessToken;

    const submitAlien = await request(app)
      .post(`/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ keystrokes: KEYSTROKES });

    expect(submitAlien.status).toBe(403);
    expect(errorCode(submitAlien)).toBe('SESSION_NOT_OWNED');
  });
});
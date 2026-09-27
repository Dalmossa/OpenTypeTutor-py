// Composition root único do runtime (ADR-024).
//
// Este arquivo é a **única** lista de use cases, repos e portas que o Nest
// conhece. Antes dele, essa lista existia em quatro cópias — `main-nest.ts`,
// `composition-root.ts` (Express), `e2e/fullFlow.test.ts` e `bench/benchHarness.ts` —
// e cada cópia tinha que ser atualizada à mão.
//
// Não é preciosismo: a lista já divergiu, e a divergência é silenciosa porque
// nenhuma dessas cópias é conferida contra a outra.
//
// 1. Seis use cases (recuperação de senha, admin settings, lesson pacing) ficaram
//    só no root Express. `npm run dev` devolvia 404 em 6 rotas com a suíte verde.
// 2. `POST /auth/admin/reset-user-password` era anônima no Express, porque o guard
//    protegia só o mount `/admin` e a rota morava em `/auth`.
// 3. `bench/benchHarness.ts` ficou tanto tempo sem touch que parou de compilar:
//    `new RefreshToken(tokenService)` quando o caso de uso já exigia o
//    `userRepository`, e faltavam os mesmos 6 use cases. `npm run bench` quebrava
//    em runtime, e `bench/` não é coberto por `tsc --noEmit` (o `include` do
//    tsconfig é `src/**/*`) nem por `eslint src` — então nada reclamou.
//
// Com um só lugar, esquecer um use case deixa de ser possível por construção: não
// há segunda lista para ficar desatualizada. O que ainda pode divergir é o
// *controller* (rota nova sem token), e esse lado é coberto pelo `nest-app.test.ts`.

import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import type { DataSource } from "typeorm";
import { createDataSource } from "./infrastructure/database/data-source.js";
import { TypeOrmUserRepository } from "./infrastructure/repositories/TypeOrmUserRepository.js";
import { TypeOrmUserProfileRepository } from "./infrastructure/repositories/TypeOrmUserProfileRepository.js";
import { TypeOrmLessonRepository } from "./infrastructure/repositories/TypeOrmLessonRepository.js";
import { TypeOrmTypingSessionRepository } from "./infrastructure/repositories/TypeOrmTypingSessionRepository.js";
import { TypeOrmKeyPerformanceRepository } from "./infrastructure/repositories/TypeOrmKeyPerformanceRepository.js";
import { TypeOrmProgressRepository } from "./infrastructure/repositories/TypeOrmProgressRepository.js";
import { TypeOrmProgressCardRepository } from "./infrastructure/repositories/TypeOrmProgressCardRepository.js";
import { TypeOrmPracticePacingRepository } from "./infrastructure/repositories/TypeOrmPracticePacingRepository.js";
import { TypeOrmDailyMetricsAggregateRepository } from "./infrastructure/repositories/TypeOrmDailyMetricsAggregateRepository.js";
import { TypeOrmKeyMasteryTransitionRepository } from "./infrastructure/repositories/TypeOrmKeyMasteryTransitionRepository.js";
import { TypeOrmPasswordResetTokenRepository } from "./infrastructure/repositories/TypeOrmPasswordResetTokenRepository.js";
import { TypeOrmAdminSettingsRepository } from "./infrastructure/repositories/TypeOrmAdminSettingsRepository.js";
import { InMemoryNGramRepository } from "./infrastructure/repositories/InMemoryNGramRepository.js";
import { BcryptPasswordHasher } from "./infrastructure/auth/BcryptPasswordHasher.js";
import { AuthPasswordValidator } from "./infrastructure/auth/AuthPasswordValidator.js";
import { JwtTokenService } from "./infrastructure/auth/JwtTokenService.js";
import { Sha256TokenHasher } from "./infrastructure/auth/Sha256TokenHasher.js";
import { rateLimitParams } from "./infrastructure/auth/rateLimitParams.js";
import { InMemoryRateLimiter } from "./infrastructure/rateLimit/InMemoryRateLimiter.js";
import { createRateLimitMiddleware } from "./presentation/middlewares/rateLimitMiddleware.js";
import { RegisterUser } from "./application/use-cases/RegisterUser.js";
import { Login } from "./application/use-cases/Login.js";
import { RefreshToken } from "./application/use-cases/RefreshToken.js";
import { GetUser } from "./application/use-cases/GetUser.js";
import { UpdateUserLayout } from "./application/use-cases/UpdateUserLayout.js";
import { ListLessons } from "./application/use-cases/ListLessons.js";
import { GetLesson } from "./application/use-cases/GetLesson.js";
import { StartTypingSession } from "./application/use-cases/StartTypingSession.js";
import { PauseTypingSession } from "./application/use-cases/PauseTypingSession.js";
import { ResumeTypingSession } from "./application/use-cases/ResumeTypingSession.js";
import { AbandonTypingSession } from "./application/use-cases/AbandonTypingSession.js";
import { SubmitTypingSession } from "./application/use-cases/SubmitTypingSession.js";
import { GetReinforcementLesson } from "./application/use-cases/GetReinforcementLesson.js";
import { GetUserProgress } from "./application/use-cases/GetUserProgress.js";
import { ResetProgress } from "./application/use-cases/ResetProgress.js";
import { GetUserKeyPerformance } from "./application/use-cases/GetUserKeyPerformance.js";
import { CheckErgonomicSafety } from "./application/use-cases/CheckErgonomicSafety.js";
import { GetNextPedagogicalLesson } from "./application/use-cases/GetNextPedagogicalLesson.js";
import { SubmitProgressCard } from "./application/use-cases/SubmitProgressCard.js";
import { GetPracticeStatus } from "./application/use-cases/GetPracticeStatus.js";
import { GetLessonPerformance } from "./application/use-cases/GetLessonPerformance.js";
import { GetDashboardHabits } from "./application/use-cases/GetDashboardHabits.js";
import { GetDashboardMastery } from "./application/use-cases/GetDashboardMastery.js";
import { GetDashboardProximity } from "./application/use-cases/GetDashboardProximity.js";
import { RequestPasswordReset } from "./application/use-cases/RequestPasswordReset.js";
import { ConfirmPasswordReset } from "./application/use-cases/ConfirmPasswordReset.js";
import { AdminResetUserPassword } from "./application/use-cases/AdminResetUserPassword.js";
import { GetAdminSettings } from "./application/use-cases/GetAdminSettings.js";
import { UpdateAdminSettings } from "./application/use-cases/UpdateAdminSettings.js";
import { GetLessonPacingStatus } from "./application/use-cases/GetLessonPacingStatus.js";
import {
  AppNestModule,
  type NestDependencyValues,
} from "./presentation/nest/appNest.js";
import { TOKENS } from "./presentation/nest/nestTokens.js";
import { AppExceptionFilter } from "./presentation/nest/app-exception.filter.js";

/**
 * Grafo de dependências do runtime: repos TypeORM sobre `dataSource` + as
 * implementações concretas de porta (bcrypt, sha256, JWT, rate limit, n-gram).
 *
 * Todo caso de uso do projeto entra aqui. Ao criar um caso de uso, a lista
 * cresce em **um** lugar, e o e2e e o bench passam a exercitá-lo porque
 * consumes este grafo em vez de tener a sua própria cópia.
 */
export function buildNestProviders(
  dataSource: DataSource,
): NestDependencyValues {
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
  const passwordResetTokenRepository = new TypeOrmPasswordResetTokenRepository(
    dataSource,
  );
  const adminSettingsRepository = new TypeOrmAdminSettingsRepository(
    dataSource,
  );

  const passwordHasher = new BcryptPasswordHasher();
  const passwordValidator = new AuthPasswordValidator();
  const tokenService = new JwtTokenService();
  const tokenHasher = new Sha256TokenHasher();
  const nGramRepository = new InMemoryNGramRepository();

  return {
    [TOKENS.TOKEN_SERVICE]: tokenService,
    [TOKENS.REGISTER_USER]: new RegisterUser(
      userRepository,
      passwordHasher,
      passwordValidator,
    ),
    [TOKENS.LOGIN]: new Login(userRepository, passwordHasher, tokenService),
    [TOKENS.REFRESH_TOKEN]: new RefreshToken(tokenService, userRepository),
    [TOKENS.GET_USER]: new GetUser(userRepository, userProfileRepository),
    [TOKENS.UPDATE_USER_LAYOUT]: new UpdateUserLayout(userProfileRepository),
    [TOKENS.LIST_LESSONS]: new ListLessons(
      lessonRepository,
      userProfileRepository,
    ),
    [TOKENS.GET_LESSON]: new GetLesson(lessonRepository),
    [TOKENS.START_SESSION]: new StartTypingSession(
      sessionRepository,
      lessonRepository,
      userProfileRepository,
      pacingRepository,
      adminSettingsRepository,
    ),
    [TOKENS.PAUSE_SESSION]: new PauseTypingSession(sessionRepository),
    [TOKENS.RESUME_SESSION]: new ResumeTypingSession(sessionRepository),
    [TOKENS.ABANDON_SESSION]: new AbandonTypingSession(sessionRepository),
    [TOKENS.SUBMIT_SESSION]: new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      pacingRepository,
      dailyAggregateRepository,
      userProfileRepository,
      masteryTransitionRepository,
      adminSettingsRepository,
    ),
    [TOKENS.GET_REINFORCEMENT_LESSON]: new GetReinforcementLesson(
      userProfileRepository,
      keyPerformanceRepository,
      nGramRepository,
    ),
    [TOKENS.GET_USER_PROGRESS]: new GetUserProgress(
      progressRepository,
      lessonRepository,
    ),
    [TOKENS.RESET_PROGRESS]: new ResetProgress(
      sessionRepository,
      keyPerformanceRepository,
      progressCardRepository,
      progressRepository,
      userProfileRepository,
      dailyAggregateRepository,
      masteryTransitionRepository,
    ),
    [TOKENS.GET_USER_KEY_PERFORMANCE]: new GetUserKeyPerformance(
      userProfileRepository,
      keyPerformanceRepository,
    ),
    [TOKENS.GET_NEXT_PEDAGOGICAL_LESSON]: new GetNextPedagogicalLesson(
      progressCardRepository,
      lessonRepository,
    ),
    [TOKENS.SUBMIT_PROGRESS_CARD]: new SubmitProgressCard(
      progressCardRepository,
      lessonRepository,
    ),
    [TOKENS.CHECK_ERGONOMIC_SAFETY]: new CheckErgonomicSafety(),
    [TOKENS.GET_PRACTICE_STATUS]: new GetPracticeStatus(
      pacingRepository,
      adminSettingsRepository,
    ),
    [TOKENS.GET_LESSON_PERFORMANCE]: new GetLessonPerformance(
      sessionRepository,
    ),
    [TOKENS.GET_DASHBOARD_HABITS]: new GetDashboardHabits(
      userProfileRepository,
      dailyAggregateRepository,
    ),
    [TOKENS.GET_DASHBOARD_MASTERY]: new GetDashboardMastery(
      userProfileRepository,
      keyPerformanceRepository,
      masteryTransitionRepository,
    ),
    [TOKENS.GET_DASHBOARD_PROXIMITY]: new GetDashboardProximity(
      userProfileRepository,
      keyPerformanceRepository,
    ),
    [TOKENS.REQUEST_PASSWORD_RESET]: new RequestPasswordReset(
      userRepository,
      passwordResetTokenRepository,
      tokenHasher,
    ),
    // Deps nomeadas, e não posicionais: `passwordHasher` e `tokenHasher` têm a
    // mesma forma (`{ hash(...) }`), então na chamada posicional trocar um pelo
    // outro compila e só falha em runtime, com 500.
    [TOKENS.CONFIRM_PASSWORD_RESET]: new ConfirmPasswordReset({
      userRepository,
      tokenRepository: passwordResetTokenRepository,
      passwordHasher,
      tokenHasher,
    }),
    [TOKENS.ADMIN_RESET_USER_PASSWORD]: new AdminResetUserPassword(
      userRepository,
      passwordHasher,
      tokenService,
    ),
    [TOKENS.GET_ADMIN_SETTINGS]: new GetAdminSettings(adminSettingsRepository),
    [TOKENS.UPDATE_ADMIN_SETTINGS]: new UpdateAdminSettings(
      adminSettingsRepository,
    ),
    [TOKENS.GET_LESSON_PACING_STATUS]: new GetLessonPacingStatus(
      pacingRepository,
      adminSettingsRepository,
    ),
  };
}

// TASK-080 follow-up (RNF06): em produção o navegador chama o backend
// diretamente (p95 ≈ 40ms direto vs ≈ 4.8s via rewrite do Next sob carga).
// Origens permitidas via CORS_ORIGINS (separadas por vírgula); vazio = sem CORS.
function corsOrigins(): string[] {
  return (process.env["CORS_ORIGINS"] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface NestRuntimeOptions {
  /** Origens liberadas. Por padrão, `CORS_ORIGINS` (vazio = CORS desligado). */
  readonly corsOrigins?: readonly string[];
}

/**
 * App Nest pronto, **sem** `listen` — quem chama decide se sobe porta
 * (`main-nest.ts`), se usa o `httpServer` com supertest (e2e) ou se quer o
 * `getHttpServer()` direto (bench).
 *
 * Middleware, filtro de exceção, CORS e rate limit são montados aqui, e não no
 * `main-nest.ts`, porque o e2e e o bench precisam exercitar o app **real**. Se
 * o filtro ou o rate limit fossem montados só no entrypoint, o e2e ficaria
 * verde sem nunca passar pelo que a produção monta — que é como o defeito do
 * `res.json(Promise)` entrou no Express: o teste estava verde e o cliente recebia
 * HTTP 200 com corpo vazio.
 */
export async function createNestApp(
  dataSource: DataSource,
  options: NestRuntimeOptions = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppNestModule.forRoot(buildNestProviders(dataSource)),
    { logger: false },
  );
  app.useGlobalFilters(new AppExceptionFilter());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  const allowedOrigins = options.corsOrigins ?? corsOrigins();
  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: [...allowedOrigins],
      methods: "GET,POST,PATCH,DELETE",
      allowedHeaders: "content-type,authorization",
      exposedHeaders: "content-type",
      maxAge: 3600,
    });
  }

  const rateLimiter = new InMemoryRateLimiter();
  app.use(
    "/auth/login",
    createRateLimitMiddleware(rateLimiter, {
      keyPrefix: "login",
      maxAttempts: rateLimitParams.LOGIN_MAX_ATTEMPTS,
      windowMs: rateLimitParams.LOGIN_WINDOW_MS,
    }),
  );
  app.use(
    "/auth/refresh",
    createRateLimitMiddleware(rateLimiter, {
      keyPrefix: "refresh",
      maxAttempts: rateLimitParams.REFRESH_MAX_ATTEMPTS,
      windowMs: rateLimitParams.REFRESH_WINDOW_MS,
    }),
  );

  await app.init();
  return app;
}

/** DataSource do runtime: `DB_PATH` + `ALL_MIGRATIONS` (schema **e** seed). */
export async function createRuntimeDataSource(): Promise<DataSource> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}

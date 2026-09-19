import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { createDataSource } from './infrastructure/database/data-source.js';
import { TypeOrmUserRepository } from './infrastructure/repositories/TypeOrmUserRepository.js';
import { TypeOrmUserProfileRepository } from './infrastructure/repositories/TypeOrmUserProfileRepository.js';
import { TypeOrmLessonRepository } from './infrastructure/repositories/TypeOrmLessonRepository.js';
import { TypeOrmTypingSessionRepository } from './infrastructure/repositories/TypeOrmTypingSessionRepository.js';
import { TypeOrmKeyPerformanceRepository } from './infrastructure/repositories/TypeOrmKeyPerformanceRepository.js';
import { TypeOrmProgressRepository } from './infrastructure/repositories/TypeOrmProgressRepository.js';
import { TypeOrmProgressCardRepository } from './infrastructure/repositories/TypeOrmProgressCardRepository.js';
import { TypeOrmPracticePacingRepository } from './infrastructure/repositories/TypeOrmPracticePacingRepository.js';
import { TypeOrmDailyMetricsAggregateRepository } from './infrastructure/repositories/TypeOrmDailyMetricsAggregateRepository.js';
import { TypeOrmKeyMasteryTransitionRepository } from './infrastructure/repositories/TypeOrmKeyMasteryTransitionRepository.js';
import { InMemoryNGramRepository } from './infrastructure/repositories/InMemoryNGramRepository.js';
import { BcryptPasswordHasher } from './infrastructure/auth/BcryptPasswordHasher.js';
import { AuthPasswordValidator } from './infrastructure/auth/AuthPasswordValidator.js';
import { JwtTokenService } from './infrastructure/auth/JwtTokenService.js';
import { rateLimitParams } from './infrastructure/auth/rateLimitParams.js';
import { InMemoryRateLimiter } from './infrastructure/rateLimit/InMemoryRateLimiter.js';
import { createRateLimitMiddleware } from './presentation/middlewares/rateLimitMiddleware.js';
import { RegisterUser } from './application/use-cases/RegisterUser.js';
import { Login } from './application/use-cases/Login.js';
import { RefreshToken } from './application/use-cases/RefreshToken.js';
import { GetUser } from './application/use-cases/GetUser.js';
import { UpdateUserLayout } from './application/use-cases/UpdateUserLayout.js';
import { ListLessons } from './application/use-cases/ListLessons.js';
import { GetLesson } from './application/use-cases/GetLesson.js';
import { StartTypingSession } from './application/use-cases/StartTypingSession.js';
import { PauseTypingSession } from './application/use-cases/PauseTypingSession.js';
import { ResumeTypingSession } from './application/use-cases/ResumeTypingSession.js';
import { AbandonTypingSession } from './application/use-cases/AbandonTypingSession.js';
import { SubmitTypingSession } from './application/use-cases/SubmitTypingSession.js';
import { GetReinforcementLesson } from './application/use-cases/GetReinforcementLesson.js';
import { GetUserKeyPerformance } from './application/use-cases/GetUserKeyPerformance.js';
import { GetUserProgress } from './application/use-cases/GetUserProgress.js';
import { ResetProgress } from './application/use-cases/ResetProgress.js';
import { CheckErgonomicSafety } from './application/use-cases/CheckErgonomicSafety.js';
import { GetNextPedagogicalLesson } from './application/use-cases/GetNextPedagogicalLesson.js';
import { SubmitProgressCard } from './application/use-cases/SubmitProgressCard.js';
import { GetPracticeStatus } from './application/use-cases/GetPracticeStatus.js';
import { GetLessonPerformance } from './application/use-cases/GetLessonPerformance.js';
import { AppNestModule, type NestDependencyValues } from './presentation/nest/appNest.js';
import { TOKENS } from './presentation/nest/nestTokens.js';
import { AppExceptionFilter } from './presentation/nest/app-exception.filter.js';

// TASK-080 follow-up (RNF06): em produção o navegador chama o backend
// diretamente (p95 ≈ 40ms direto vs ≈ 4.8s via rewrite do Next sob carga).
// Origens permitidas via CORS_ORIGINS (separadas por vírgula); vazio = sem CORS.
function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await dataSource.runMigrations();

  const userRepository = new TypeOrmUserRepository(dataSource);
  const userProfileRepository = new TypeOrmUserProfileRepository(dataSource);
  const lessonRepository = new TypeOrmLessonRepository(dataSource);
  const sessionRepository = new TypeOrmTypingSessionRepository(dataSource);
  const keyPerformanceRepository = new TypeOrmKeyPerformanceRepository(dataSource);
  const progressRepository = new TypeOrmProgressRepository(dataSource);
  const progressCardRepository = new TypeOrmProgressCardRepository(dataSource);
  const pacingRepository = new TypeOrmPracticePacingRepository(dataSource);
  const dailyAggregateRepository = new TypeOrmDailyMetricsAggregateRepository(dataSource);
  const masteryTransitionRepository = new TypeOrmKeyMasteryTransitionRepository(dataSource);

  const passwordHasher = new BcryptPasswordHasher();
  const passwordValidator = new AuthPasswordValidator();
  const tokenService = new JwtTokenService();
  const nGramRepository = new InMemoryNGramRepository();

  const deps: NestDependencyValues = {
    [TOKENS.TOKEN_SERVICE]: tokenService,
    [TOKENS.REGISTER_USER]: new RegisterUser(userRepository, passwordHasher, passwordValidator),
    [TOKENS.LOGIN]: new Login(userRepository, passwordHasher, tokenService),
    [TOKENS.REFRESH_TOKEN]: new RefreshToken(tokenService),
    [TOKENS.GET_USER]: new GetUser(userRepository, userProfileRepository),
    [TOKENS.UPDATE_USER_LAYOUT]: new UpdateUserLayout(userProfileRepository),
    [TOKENS.LIST_LESSONS]: new ListLessons(lessonRepository, userProfileRepository),
    [TOKENS.GET_LESSON]: new GetLesson(lessonRepository),
    [TOKENS.START_SESSION]: new StartTypingSession(sessionRepository, lessonRepository, userProfileRepository, pacingRepository),
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
      masteryTransitionRepository
    ),
    [TOKENS.GET_REINFORCEMENT_LESSON]: new GetReinforcementLesson(
      userProfileRepository,
      keyPerformanceRepository,
      nGramRepository
    ),
    [TOKENS.GET_USER_PROGRESS]: new GetUserProgress(progressRepository, lessonRepository),
    [TOKENS.RESET_PROGRESS]: new ResetProgress(
      sessionRepository,
      keyPerformanceRepository,
      progressCardRepository,
      progressRepository,
      userProfileRepository
    ),
    [TOKENS.GET_USER_KEY_PERFORMANCE]: new GetUserKeyPerformance(userProfileRepository, keyPerformanceRepository),
    [TOKENS.GET_NEXT_PEDAGOGICAL_LESSON]: new GetNextPedagogicalLesson(progressCardRepository, lessonRepository),
    [TOKENS.SUBMIT_PROGRESS_CARD]: new SubmitProgressCard(progressCardRepository, lessonRepository),
    [TOKENS.CHECK_ERGONOMIC_SAFETY]: new CheckErgonomicSafety(),
    [TOKENS.GET_PRACTICE_STATUS]: new GetPracticeStatus(pacingRepository),
    [TOKENS.GET_LESSON_PERFORMANCE]: new GetLessonPerformance(sessionRepository),
  };

  const app = await NestFactory.create<NestExpressApplication>(AppNestModule.forRoot(deps));
  app.useGlobalFilters(new AppExceptionFilter());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const allowedOrigins = corsOrigins();
  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: allowedOrigins,
      methods: 'GET,POST,PATCH,DELETE',
      allowedHeaders: 'content-type,authorization',
      exposedHeaders: 'content-type',
      maxAge: 3600,
    });
  }

  const rateLimiter = new InMemoryRateLimiter();
  app.use(
    '/auth/login',
    createRateLimitMiddleware(rateLimiter, {
      keyPrefix: 'login',
      maxAttempts: rateLimitParams.LOGIN_MAX_ATTEMPTS,
      windowMs: rateLimitParams.LOGIN_WINDOW_MS,
    })
  );
  app.use(
    '/auth/refresh',
    createRateLimitMiddleware(rateLimiter, {
      keyPrefix: 'refresh',
      maxAttempts: rateLimitParams.REFRESH_MAX_ATTEMPTS,
      windowMs: rateLimitParams.REFRESH_WINDOW_MS,
    })
  );

  const PORT = Number(process.env.PORT ?? 3000);
  await app.listen(PORT);
  console.info(`[server] OpenType tutor (Nest) ouvindo em http://localhost:${String(PORT)}`);
}

bootstrap().catch((error: unknown) => {
  console.error('[server] Falha ao iniciar (Nest)', error);
  process.exit(1);
});
import { createDataSource } from './infrastructure/database/data-source.js';
import { TypeOrmUserRepository } from './infrastructure/repositories/TypeOrmUserRepository.js';
import { TypeOrmUserProfileRepository } from './infrastructure/repositories/TypeOrmUserProfileRepository.js';
import { TypeOrmLessonRepository } from './infrastructure/repositories/TypeOrmLessonRepository.js';
import { TypeOrmTypingSessionRepository } from './infrastructure/repositories/TypeOrmTypingSessionRepository.js';
import { TypeOrmKeyPerformanceRepository } from './infrastructure/repositories/TypeOrmKeyPerformanceRepository.js';
import { TypeOrmProgressRepository } from './infrastructure/repositories/TypeOrmProgressRepository.js';
import { TypeOrmProgressCardRepository } from './infrastructure/repositories/TypeOrmProgressCardRepository.js';
import { TypeOrmPracticePacingRepository } from './infrastructure/repositories/TypeOrmPracticePacingRepository.js';
import { InMemoryNGramRepository } from './infrastructure/repositories/InMemoryNGramRepository.js';
import { BcryptPasswordHasher } from './infrastructure/auth/BcryptPasswordHasher.js';
import { AuthPasswordValidator } from './infrastructure/auth/AuthPasswordValidator.js';
import { JwtTokenService } from './infrastructure/auth/JwtTokenService.js';
import { rateLimitParams } from './infrastructure/auth/rateLimitParams.js';
import { InMemoryRateLimiter } from './infrastructure/rateLimit/InMemoryRateLimiter.js';
import { createAuthMiddleware } from './presentation/middlewares/authMiddleware.js';
import { createRateLimitMiddleware } from './presentation/middlewares/rateLimitMiddleware.js';
import { createApp } from './presentation/app.js';
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
import { CheckErgonomicSafety } from './application/use-cases/CheckErgonomicSafety.js';
import { GetNextPedagogicalLesson } from './application/use-cases/GetNextPedagogicalLesson.js';
import { SubmitProgressCard } from './application/use-cases/SubmitProgressCard.js';
import { GetPracticeStatus } from './application/use-cases/GetPracticeStatus.js';
import { GetLessonPerformance } from './application/use-cases/GetLessonPerformance.js';

async function main(): Promise<void> {
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

  const app = createApp({
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
      pacingRepository
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
  });

  const PORT = Number(process.env.PORT ?? 3000);
  const server = app.listen(PORT, () => {
    console.info(`[server] OpenType tutor ouvindo em http://localhost:${String(PORT)}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void dataSource.destroy().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('[server] Falha ao iniciar', error);
  process.exit(1);
});
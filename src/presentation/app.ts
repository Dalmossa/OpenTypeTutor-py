import express, { type RequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError.js';
import type {
  CheckErgonomicSafetyPort,
  GetLessonPort,
  GetNextPedagogicalLessonPort,
  GetPracticeStatusPort,
  GetReinforcementLessonPort,
  GetUserKeyPerformancePort,
  GetUserPort,
  GetUserProgressPort,
  ListLessonsPort,
  LoginPort,
  RefreshTokenPort,
  RegisterUserPort,
  SessionCommandPort,
  StartSessionPort,
  SubmitProgressCardPort,
  SubmitSessionPort,
  UpdateUserLayoutPort,
} from './ports/useCasePorts.js';
import { createErrorHandler } from './middlewares/errorHandler.js';
import { AuthController } from './controllers/authController.js';
import { LessonController } from './controllers/lessonController.js';
import { PedagogicalController } from './controllers/pedagogicalController.js';
import { ProgressController } from './controllers/progressController.js';
import { SessionController } from './controllers/sessionController.js';
import { UserController } from './controllers/userController.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createLessonRoutes } from './routes/lessonRoutes.js';
import { createPedagogicalRoutes } from './routes/pedagogicalRoutes.js';
import { createProgressRoutes } from './routes/progressRoutes.js';
import { createSessionRoutes } from './routes/sessionRoutes.js';
import { createUserRoutes } from './routes/userRoutes.js';

export interface AppDependencies {
  authMiddleware: RequestHandler;
  loginRateLimiter: RequestHandler;
  refreshRateLimiter: RequestHandler;
  registerUser: RegisterUserPort;
  login: LoginPort;
  refreshToken: RefreshTokenPort;
  getUser: GetUserPort;
  updateUserLayout: UpdateUserLayoutPort;
  listLessons: ListLessonsPort;
  getLesson: GetLessonPort;
  startSession: StartSessionPort;
  pauseSession: SessionCommandPort;
  resumeSession: SessionCommandPort;
  abandonSession: SessionCommandPort;
  submitSession: SubmitSessionPort;
  getReinforcementLesson: GetReinforcementLessonPort;
  getUserProgress: GetUserProgressPort;
  getUserKeyPerformance: GetUserKeyPerformancePort;
  getNextPedagogicalLesson: GetNextPedagogicalLessonPort;
  submitProgressCard: SubmitProgressCardPort;
  checkErgonomicSafety: CheckErgonomicSafetyPort;
  getPracticeStatus: GetPracticeStatusPort;
}

export function createApp(deps: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const authController = new AuthController(deps.registerUser, deps.login, deps.refreshToken);
  const userController = new UserController(deps.getUser, deps.updateUserLayout);
  const lessonController = new LessonController(deps.listLessons, deps.getLesson);
  const sessionController = new SessionController(
    deps.startSession,
    deps.pauseSession,
    deps.resumeSession,
    deps.abandonSession,
    deps.submitSession
  );
  const progressController = new ProgressController(
    deps.getReinforcementLesson,
    deps.getUserProgress,
    deps.getUserKeyPerformance,
    deps.getPracticeStatus
  );
  const pedagogicalController = new PedagogicalController(
    deps.getNextPedagogicalLesson,
    deps.submitProgressCard,
    deps.checkErgonomicSafety
  );

  app.use('/auth', createAuthRoutes(authController, deps.loginRateLimiter, deps.refreshRateLimiter));
  app.use('/users', deps.authMiddleware, createUserRoutes(userController));
  app.use('/lessons', deps.authMiddleware, createLessonRoutes(lessonController));
  app.use('/sessions', deps.authMiddleware, createSessionRoutes(sessionController));
  app.use('/me', deps.authMiddleware, createProgressRoutes(progressController));
  app.use('/me', deps.authMiddleware, createPedagogicalRoutes(pedagogicalController));

  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', 'Rota não encontrada', 404));
  });

  app.use(createErrorHandler());

  return app;
}
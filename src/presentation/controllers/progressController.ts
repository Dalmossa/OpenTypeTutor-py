import type { Request, Response } from 'express';
import type {
  GetPracticeStatusPort,
  GetReinforcementLessonPort,
  GetUserKeyPerformancePort,
  GetUserProgressPort,
} from '../ports/useCasePorts.js';
import { getAuthUserId } from '../middlewares/authMiddleware.js';

export class ProgressController {
  constructor(
    private readonly getReinforcementLesson: GetReinforcementLessonPort,
    private readonly getUserProgress: GetUserProgressPort,
    private readonly getUserKeyPerformance: GetUserKeyPerformancePort,
    private readonly getPracticeStatus: GetPracticeStatusPort
  ) {}

  async reinforcementLesson(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.getReinforcementLesson.execute(userId);
    res.json(result);
  }

  async progress(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.getUserProgress.execute(userId);
    res.json(result);
  }

  async keyPerformance(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.getUserKeyPerformance.execute(userId);
    res.json(result);
  }

  // RN33 - estado de pacing (acumulado, limites e pausa restante) para a UI cronometrar
  async practiceStatus(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.getPracticeStatus.execute(userId);
    res.json(result);
  }
}
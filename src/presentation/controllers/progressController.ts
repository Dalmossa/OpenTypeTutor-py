import type { Request, Response } from 'express';
import type {
  GetReinforcementLessonPort,
  GetUserKeyPerformancePort,
  GetUserProgressPort,
} from '../ports/useCasePorts.js';
import { getAuthUserId } from '../middlewares/authMiddleware.js';

export class ProgressController {
  constructor(
    private readonly getReinforcementLesson: GetReinforcementLessonPort,
    private readonly getUserProgress: GetUserProgressPort,
    private readonly getUserKeyPerformance: GetUserKeyPerformancePort
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
}
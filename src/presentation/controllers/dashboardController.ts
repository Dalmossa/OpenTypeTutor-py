import type { Request, Response } from "express";
import type {
  GetDashboardHabitsPort,
  GetDashboardMasteryPort,
  GetDashboardProximityPort,
} from "../ports/useCasePorts.js";
import { getAuthUserId } from "../middlewares/authMiddleware.js";

export class DashboardController {
  constructor(
    private readonly dashboardHabits: GetDashboardHabitsPort,
    private readonly dashboardMastery: GetDashboardMasteryPort,
    private readonly dashboardProximity: GetDashboardProximityPort,
  ) {}

  async habits(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.dashboardHabits.execute(userId);
    res.json(result);
  }

  async mastery(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.dashboardMastery.execute(userId);
    res.json(result);
  }

  async proximity(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.dashboardProximity.execute(userId);
    res.json(result);
  }
}

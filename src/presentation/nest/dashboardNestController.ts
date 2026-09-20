import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from "../../application/dtos/DashboardDTOs.js";
import type {
  GetDashboardHabitsPort,
  GetDashboardMasteryPort,
  GetDashboardProximityPort,
} from "../ports/useCasePorts.js";
import { AuthGuard, getRequestUserId } from "./auth.guard.js";
import { TOKENS } from "./nestTokens.js";

@Controller("/me/dashboard")
@UseGuards(AuthGuard)
export class DashboardNestController {
  constructor(
    @Inject(TOKENS.GET_DASHBOARD_HABITS)
    private readonly dashboardHabits: GetDashboardHabitsPort,
    @Inject(TOKENS.GET_DASHBOARD_MASTERY)
    private readonly dashboardMastery: GetDashboardMasteryPort,
    @Inject(TOKENS.GET_DASHBOARD_PROXIMITY)
    private readonly dashboardProximity: GetDashboardProximityPort,
  ) {}

  @Get("habits")
  async habits(@Req() req: Request): Promise<GetDashboardHabitsResponseDTO> {
    const userId = getRequestUserId(req);
    return this.dashboardHabits.execute(userId);
  }

  @Get("mastery")
  async mastery(@Req() req: Request): Promise<GetDashboardMasteryResponseDTO> {
    const userId = getRequestUserId(req);
    return this.dashboardMastery.execute(userId);
  }

  @Get("proximity")
  async proximity(
    @Req() req: Request,
  ): Promise<GetDashboardProximityResponseDTO> {
    const userId = getRequestUserId(req);
    return this.dashboardProximity.execute(userId);
  }
}

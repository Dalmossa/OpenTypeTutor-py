import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from "@/models/dashboard";
import type { ApiClient } from "@/services/api-client";

// Fase 9 — Dashboard (RN34–RN37). Controller de UI espelha as 3 rotas
// GET /me/dashboard/* com o token do usuário autenticado.
export class DashboardController {
  constructor(private readonly api: ApiClient) {}

  async getHabits(token: string): Promise<GetDashboardHabitsResponseDTO> {
    return this.api.getDashboardHabits(token);
  }

  async getMastery(token: string): Promise<GetDashboardMasteryResponseDTO> {
    return this.api.getDashboardMastery(token);
  }

  async getProximity(token: string): Promise<GetDashboardProximityResponseDTO> {
    return this.api.getDashboardProximity(token);
  }
}

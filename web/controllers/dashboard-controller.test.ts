import { describe, expect, it, vi } from "vitest";

import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from "@/models/dashboard";
import type { ApiClient } from "@/services/api-client";
import { DashboardController } from "./dashboard-controller";

function makeApiClient(): {
  getDashboardHabits: ReturnType<typeof vi.fn>;
  getDashboardMastery: ReturnType<typeof vi.fn>;
  getDashboardProximity: ReturnType<typeof vi.fn>;
} {
  return {
    getDashboardHabits: vi.fn(),
    getDashboardMastery: vi.fn(),
    getDashboardProximity: vi.fn(),
  };
}

describe("DashboardController (TASK-098, Fase 9)", () => {
  it("delega getHabits para a rota GET /me/dashboard/habits com o token", async () => {
    const api = makeApiClient();
    const dto: GetDashboardHabitsResponseDTO = {
      kpis: {
        netWpm: 40.5,
        accuracy: 0.95,
        averageLatencyMs: 250,
        sessionsCompleted: 12,
        daysActive: 5,
        keysPracticed: 4,
      },
      trend: [],
      heatmap: [{ logicalKey: "a", count: 100, activeDays: 2 }],
    };
    api.getDashboardHabits.mockResolvedValue(dto);

    const controller = new DashboardController(api as unknown as ApiClient);
    await expect(controller.getHabits("token-abc")).resolves.toEqual(dto);
    expect(api.getDashboardHabits).toHaveBeenCalledWith("token-abc");
  });

  it("delega getMastery para GET /me/dashboard/mastery com o token", async () => {
    const api = makeApiClient();
    const dto: GetDashboardMasteryResponseDTO = {
      transitions: [
        {
          logicalKey: "a",
          date: "2026-09-01",
          from: "LEARNING",
          to: "MASTERED",
        },
      ],
      countsByState: {
        UNKNOWN: 0,
        LEARNING: 1,
        CONSOLIDATING: 0,
        MASTERED: 1,
        WEAK: 0,
      },
    };
    api.getDashboardMastery.mockResolvedValue(dto);

    const controller = new DashboardController(api as unknown as ApiClient);
    await expect(controller.getMastery("token-abc")).resolves.toEqual(dto);
    expect(api.getDashboardMastery).toHaveBeenCalledWith("token-abc");
  });

  it("delega getProximity para GET /me/dashboard/proximity com o token", async () => {
    const api = makeApiClient();
    const dto: GetDashboardProximityResponseDTO = {
      keys: [{ logicalKey: "a", mpi: 0.75, band: "próximo" }],
    };
    api.getDashboardProximity.mockResolvedValue(dto);

    const controller = new DashboardController(api as unknown as ApiClient);
    await expect(controller.getProximity("token-abc")).resolves.toEqual(dto);
    expect(api.getDashboardProximity).toHaveBeenCalledWith("token-abc");
  });
});

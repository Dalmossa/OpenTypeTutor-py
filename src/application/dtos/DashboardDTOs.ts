// Fase 9 — Dashboard (RN34–RN37, ADR-020). Respostas dos endpoints GET /me/dashboard/*.

export interface DashboardKPI {
  netWpm: number;
  accuracy: number; // 0..1
  averageLatencyMs: number;
  sessionsCompleted: number;
  daysActive: number;
  keysPracticed: number;
}

export interface DashboardTrendPoint {
  date: string; // YYYY-MM-DD local do usuário (RN37)
  netWpm: number;
  accuracy: number; // 0..1
  averageLatencyMs: number;
  sessionsCompleted: number;
}

export interface DashboardHeatmapKey {
  logicalKey: string;
  count: number; // acionamentos na janela (RN34)
  activeDays: number; // dias distintos com prática na janela (RN34)
}

export interface GetDashboardHabitsResponseDTO {
  kpis: DashboardKPI;
  trend: DashboardTrendPoint[];
  heatmap: DashboardHeatmapKey[];
}

export interface DashboardCountsByState {
  UNKNOWN: number;
  LEARNING: number;
  CONSOLIDATING: number;
  MASTERED: number;
  WEAK: number;
}

export interface GetDashboardMasteryResponseDTO {
  transitions: {
    logicalKey: string;
    date: string; // YYYY-MM-DD local do usuário (RN37)
    from: string;
    to: string;
  }[];
  countsByState: DashboardCountsByState;
}

export interface DashboardProximityKey {
  logicalKey: string;
  mpi: number; // [0,1] (RN36)
  band: string; // rótulo pt-BR junto da cor (RN36)
}

export interface GetDashboardProximityResponseDTO {
  keys: DashboardProximityKey[];
}
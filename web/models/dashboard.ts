// Fase 9 — Dashboard (RN34–RN37, ADR-020). Tipos = espelho dos DTOs REST de
// GET /me/dashboard/{habits,mastery,proximity} (src/application/dtos/DashboardDTOs.ts).
// Nenhuma RN no cliente (ADR-018) — a UI apenas renderiza estes DTOs.

export interface PeriodComparison<T> {
  current: T;
  previous: T | null;
  delta: number; // current - previous (pode ser negativo)
  deltaPercent: number | null; // (delta / previous) * 100, null se previous === 0 ou null
}

export interface DashboardKPI {
  netWpm: number;
  accuracy: number; // 0..1
  averageLatencyMs: number;
  sessionsCompleted: number;
  daysActive: number;
  keysPracticed: number;
}

export interface DashboardKPIWithComparison extends DashboardKPI {
  netWpmComparison?: PeriodComparison<number>;
  accuracyComparison?: PeriodComparison<number>;
  latencyComparison?: PeriodComparison<number>;
  sessionsComparison?: PeriodComparison<number>;
  daysActiveComparison?: PeriodComparison<number>;
  keysPracticedComparison?: PeriodComparison<number>;
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

export interface DashboardTransition {
  logicalKey: string;
  date: string; // YYYY-MM-DD local do usuário (RN37)
  from: string;
  to: string;
}

export interface GetDashboardMasteryResponseDTO {
  transitions: DashboardTransition[];
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

// Helpers de seleção de janela (página do dashboard)
export type PresetWindow = 7 | 30 | 90;
export type TrendWindow = PresetWindow | "custom";

export interface CustomDateRange {
  kind: "custom";
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export type DateRangeSelection = PresetWindow | CustomDateRange;

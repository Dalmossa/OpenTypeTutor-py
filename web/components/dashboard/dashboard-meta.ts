import type { MasteryState } from "@/models/progress";
import type {
  DashboardTrendPoint,
  DashboardKPI,
  DashboardKPIWithComparison,
  PeriodComparison,
} from "@/models/dashboard";

// Metadados visuais do dashboard (RN32/RN36) — rótulo pt-BR sempre junto da cor
// (acessibilidade: cor nunca sozinha, ADR-020). Nenhuma RN aqui.

export const MASTERY_LABELS: Record<MasteryState, string> = {
  UNKNOWN: "Desconhecido",
  LEARNING: "Aprendendo",
  CONSOLIDATING: "Consolidando",
  MASTERED: "Dominado",
  WEAK: "Fraco",
};

export const MASTERY_BADGE_CLASS: Record<MasteryState, string> = {
  UNKNOWN: "bg-chip-neutral-bg text-chip-neutral-fg",
  LEARNING: "bg-chip-warning-bg text-chip-warning-fg",
  CONSOLIDATING: "bg-chip-info-bg text-chip-info-fg",
  MASTERED: "bg-chip-success-bg text-chip-success-fg",
  WEAK: "bg-chip-danger-bg text-chip-danger-fg",
};

// RN36 - faixas do MasteryProximityIndex devolvidas pelo backend (band pt-BR).
// O chip aplica cor + rótulo juntos para nunca depender só da cor.
export const BAND_CHIP_CLASS: Record<string, string> = {
  longe: "bg-chip-danger-bg text-chip-danger-fg",
  "em progresso": "bg-chip-warning-bg text-chip-warning-fg",
  próximo: "bg-chip-info-bg text-chip-info-fg",
  "às vésperas": "bg-chip-success-bg text-chip-success-fg",
};

// RN32 - estados de status por lição (reuso no dashboard de transições)
export const TRANSITION_STATE = new Set<MasteryState>([
  "UNKNOWN",
  "LEARNING",
  "CONSOLIDATING",
  "MASTERED",
  "WEAK",
]);

export function isMasteryState(value: string): value is MasteryState {
  return TRANSITION_STATE.has(value as MasteryState);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

export function formatWpm(wpm: number): string {
  return wpm.toFixed(1);
}

export function formatDateKey(dateKey: string): string {
  const [year = "—", month = "—", day = "—"] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

// Helpers para comparação período-a-período
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeComparison(
  current: number,
  previous: number | null,
): PeriodComparison<number> {
  if (previous === null || previous === 0) {
    return { current, previous: null, delta: 0, deltaPercent: null };
  }
  const delta = current - previous;
  const deltaPercent = (delta / previous) * 100;
  return { current, previous, delta, deltaPercent };
}

export function enrichKPIsWithComparison(
  kpis: DashboardKPI,
  trend: DashboardTrendPoint[],
  windowDays: number,
): DashboardKPIWithComparison {
  if (trend.length === 0) {
    return kpis;
  }

  const sortedTrend = [...trend].sort((a, b) => a.date.localeCompare(b.date));
  const currentWindow = sortedTrend.slice(-windowDays);
  const previousWindow = sortedTrend.slice(-windowDays * 2, -windowDays);

  const currentValues = {
    netWpm: avg(currentWindow.map((p) => p.netWpm)),
    accuracy: avg(currentWindow.map((p) => p.accuracy)),
    averageLatencyMs: avg(currentWindow.map((p) => p.averageLatencyMs)),
    sessionsCompleted: currentWindow.reduce(
      (sum, p) => sum + p.sessionsCompleted,
      0,
    ),
    daysActive: currentWindow.filter((p) => p.sessionsCompleted > 0).length,
    keysPracticed: 0, // não disponível no trend diário
  };

  const previousValues = {
    netWpm: avg(previousWindow.map((p) => p.netWpm)),
    accuracy: avg(previousWindow.map((p) => p.accuracy)),
    averageLatencyMs: avg(previousWindow.map((p) => p.averageLatencyMs)),
    sessionsCompleted: previousWindow.reduce(
      (sum, p) => sum + p.sessionsCompleted,
      0,
    ),
    daysActive: previousWindow.filter((p) => p.sessionsCompleted > 0).length,
    keysPracticed: 0,
  };

  return {
    ...kpis,
    netWpmComparison: computeComparison(
      currentValues.netWpm,
      previousValues.netWpm || null,
    ),
    accuracyComparison: computeComparison(
      currentValues.accuracy,
      previousValues.accuracy || null,
    ),
    latencyComparison: computeComparison(
      currentValues.averageLatencyMs,
      previousValues.averageLatencyMs || null,
    ),
    sessionsComparison: computeComparison(
      currentValues.sessionsCompleted,
      previousValues.sessionsCompleted || null,
    ),
    daysActiveComparison: computeComparison(
      currentValues.daysActive,
      previousValues.daysActive || null,
    ),
    keysPracticedComparison: computeComparison(
      currentValues.keysPracticed,
      previousValues.keysPracticed || null,
    ),
  };
}

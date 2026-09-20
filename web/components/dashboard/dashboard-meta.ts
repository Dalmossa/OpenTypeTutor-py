import type { MasteryState } from "@/models/progress";

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
  UNKNOWN: "bg-slate-100 text-slate-600",
  LEARNING: "bg-amber-100 text-amber-700",
  CONSOLIDATING: "bg-blue-100 text-blue-700",
  MASTERED: "bg-green-100 text-green-700",
  WEAK: "bg-red-100 text-red-700",
};

// RN36 - faixas do MasteryProximityIndex devolvidas pelo backend (band pt-BR).
// O chip aplica cor + rótulo juntos para nunca depender só da cor.
export const BAND_CHIP_CLASS: Record<string, string> = {
  longe: "bg-red-100 text-red-700",
  "em progresso": "bg-amber-100 text-amber-700",
  próximo: "bg-blue-100 text-blue-700",
  "às vésperas": "bg-green-100 text-green-700",
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

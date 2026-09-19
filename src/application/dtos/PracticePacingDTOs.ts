// RN33 - estado de pacing de prática reportado à UI (clientes não reimplementam a regra, ADR-018)
export interface PracticeStatusDTO {
  accumulatedActiveMs: number;
  practiceBlockMs: number;
  minBreakMs: number;
  breakRequired: boolean;
  breakRemainingMs: number;
}

// Relógio injetável (testes determinísticos; padrão do domínio RN33)
export type Clock = () => Date;
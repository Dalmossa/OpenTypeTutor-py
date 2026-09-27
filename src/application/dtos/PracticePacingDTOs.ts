// RN33 - estado de pacing de prática reportado à UI (clientes não reimplementam a regra, ADR-018)
export interface PracticeStatusDTO {
  accumulatedActiveMs: number;
  practiceBlockMs: number;
  minBreakMs: number;
  breakRequired: boolean;
  breakRemainingMs: number;
}

// RN34 - estado de macro-pausa (pós N lições completadas)
export interface LessonPacingStatusDTO {
  lessonsSinceMacroBreak: number;
  macroLessonsThreshold: number;
  macroBreakEnabled: boolean;
  macroBreakDurationMs: number;
  macroBreakRequired: boolean;
  macroBreakRemainingMs: number;
  nextAvailableAt: string | null; // ISO string, null se não há macro-pausa ativa
}

// Relógio injetável (testes determinísticos; padrão do domínio RN33)
export type Clock = () => Date;

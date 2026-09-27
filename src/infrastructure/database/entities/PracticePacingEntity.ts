import { EntitySchema } from "typeorm";

export interface PracticePacingRow {
  userId: string;
  accumulatedActiveMs: number;
  lastSessionEndedAt: string | null;
  completedLessonsSinceMacroBreak: number;
  macroBreakEndsAt: string | null;
}

// RN33 - estado de pacing de prática persistido por usuário (chave primária = userId, RN17)
// RN34 - macro-pausa: após N lições completadas → pausa longa
export const PracticePacingEntity = new EntitySchema<PracticePacingRow>({
  name: "PracticePacingEntity",
  tableName: "practice_pacing",
  columns: {
    userId: { type: "text", primary: true },
    accumulatedActiveMs: { type: "int", nullable: false },
    lastSessionEndedAt: { type: "text", nullable: true },
    completedLessonsSinceMacroBreak: {
      type: "int",
      nullable: false,
      default: 0,
    },
    macroBreakEndsAt: { type: "text", nullable: true },
  },
});

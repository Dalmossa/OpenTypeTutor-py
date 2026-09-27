import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { PracticePacingState } from "../../domain/entities/PracticePacingState.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";
import type { LessonPacingStatusDTO } from "../dtos/PracticePacingDTOs.js";

// RN34 - consulta de macro-pacing para a UI: lições completadas, threshold, pausa restante.
export class GetLessonPacingStatus {
  constructor(private readonly pacingRepository: IPracticePacingRepository) {}

  async execute(userId: string): Promise<LessonPacingStatusDTO> {
    const pacing =
      (await this.pacingRepository.findByUserId(SessionId.create(userId))) ??
      PracticePacingState.create({ userId: SessionId.create(userId) });

    const now = new Date();
    const macroBreakRequired = pacing.isMacroBreakRequired(now);
    const macroBreakRemainingMs = pacing.macroBreakRemainingMs(now);

    return {
      lessonsSinceMacroBreak: pacing.completedLessonsSinceMacroBreak,
      macroLessonsThreshold: adaptiveParams.MACRO_LESSONS_THRESHOLD,
      macroBreakEnabled: adaptiveParams.MACRO_BREAK_ENABLED,
      macroBreakDurationMs: adaptiveParams.MACRO_BREAK_DURATION_MS,
      macroBreakRequired,
      macroBreakRemainingMs,
      nextAvailableAt: macroBreakRequired
        ? (pacing.macroBreakEndsAt?.toISOString() ?? null)
        : null,
    };
  }
}

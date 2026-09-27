import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import {
  PracticePacingState,
  type PacingParams,
  toPacingParams,
} from "../../domain/entities/PracticePacingState.js";
import type { PracticeStatusDTO } from "../dtos/PracticePacingDTOs.js";

// RN33 - consulta de pacing para a UI: acumulado, limites e pausa restante.
export class GetPracticeStatus {
  constructor(
    private readonly pacingRepository: IPracticePacingRepository,
    private readonly adminSettingsRepository: IAdminSettingsRepository,
  ) {}

  async execute(userId: string): Promise<PracticeStatusDTO> {
    const pacing =
      (await this.pacingRepository.findByUserId(SessionId.create(userId))) ??
      PracticePacingState.create({ userId: SessionId.create(userId) });

    // Busca admin settings efetivos para o pacing
    const adminSettings = await this.adminSettingsRepository.find();
    const pacingParams: PacingParams | undefined =
      adminSettings?.getEffectiveParams()
        ? {
            macroBreakEnabled:
              adminSettings.getEffectiveParams().MACRO_BREAK_ENABLED,
            macroLessonsThreshold:
              adminSettings.getEffectiveParams().MACRO_LESSONS_THRESHOLD,
            macroBreakDurationMs:
              adminSettings.getEffectiveParams().MACRO_BREAK_DURATION_MS,
            practiceBlockDurationMs:
              adminSettings.getEffectiveParams().PRACTICE_BLOCK_DURATION_MS,
            minBreakDurationMs:
              adminSettings.getEffectiveParams().MIN_BREAK_DURATION_MS,
          }
        : undefined;

    const now = new Date();
    const effectiveParams: PacingParams = pacingParams ?? toPacingParams();

    return {
      accumulatedActiveMs: pacing.accumulatedActiveMs,
      practiceBlockMs: effectiveParams.practiceBlockDurationMs,
      minBreakMs: effectiveParams.minBreakDurationMs,
      breakRequired: pacing.isBreakRequired(now, pacingParams),
      breakRemainingMs: pacing.breakRemainingMs(now, pacingParams),
    };
  }
}

import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import {
  PracticePacingState,
  type PacingParams,
  toPacingParams,
} from "../../domain/entities/PracticePacingState.js";
import type {
  Clock,
  LessonPacingStatusDTO,
} from "../dtos/PracticePacingDTOs.js";

// RN34 - consulta de macro-pacing para a UI: lições completadas, threshold, pausa restante.
export class GetLessonPacingStatus {
  // O Clock entra por construtor pelo mesmo motivo que em `PasswordResetToken.create`:
  // `isMacroBreakRequired(now)` compara `now` com `macroBreakEndsAt`, então com
  // `new Date()` interno o caso de uso é indeterminístico e o teste só consegue
  // afirmar o caminho trivial (nenhuma macro-pausa ativa).
  constructor(
    private readonly pacingRepository: IPracticePacingRepository,
    private readonly adminSettingsRepository: IAdminSettingsRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(userId: string): Promise<LessonPacingStatusDTO> {
    const userSessionId = SessionId.create(userId);
    const stored = await this.pacingRepository.findByUserId(userSessionId);
    const pacing =
      stored ?? PracticePacingState.create({ userId: userSessionId });

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

    const now = this.now();
    const macroBreakRequired = pacing.isMacroBreakRequired(now, pacingParams);
    const macroBreakRemainingMs = pacing.macroBreakRemainingMs(
      now,
      pacingParams,
    );

    // O threshold e duração retornados no DTO devem refletir o que está ativo
    // (admin settings > adaptiveParams defaults)
    const effectiveParams: PacingParams = pacingParams ?? toPacingParams();

    return {
      lessonsSinceMacroBreak: pacing.completedLessonsSinceMacroBreak,
      macroLessonsThreshold: effectiveParams.macroLessonsThreshold,
      macroBreakEnabled: effectiveParams.macroBreakEnabled,
      macroBreakDurationMs: effectiveParams.macroBreakDurationMs,
      macroBreakRequired,
      macroBreakRemainingMs,
      // Só há data quando a pausa está de fato em curso: com `macroBreakRequired`
      // falso, `nextAvailableAt` é null mesmo que `macroBreakEndsAt` exista no
      // storage (pausa já cumprida mas ciclo não reiniciado).
      nextAvailableAt: macroBreakRequired
        ? (pacing.macroBreakEndsAt?.toISOString() ?? null)
        : null,
    };
  }
}

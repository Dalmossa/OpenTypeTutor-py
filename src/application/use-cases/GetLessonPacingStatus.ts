import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { PracticePacingState } from "../../domain/entities/PracticePacingState.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";
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
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(userId: string): Promise<LessonPacingStatusDTO> {
    const userSessionId = SessionId.create(userId);
    const stored = await this.pacingRepository.findByUserId(userSessionId);
    const pacing =
      stored ?? PracticePacingState.create({ userId: userSessionId });

    const now = this.now();
    const macroBreakRequired = pacing.isMacroBreakRequired(now);
    const macroBreakRemainingMs = pacing.macroBreakRemainingMs(now);

    return {
      lessonsSinceMacroBreak: pacing.completedLessonsSinceMacroBreak,
      macroLessonsThreshold: adaptiveParams.MACRO_LESSONS_THRESHOLD,
      macroBreakEnabled: adaptiveParams.MACRO_BREAK_ENABLED,
      macroBreakDurationMs: adaptiveParams.MACRO_BREAK_DURATION_MS,
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

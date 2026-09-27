import type { ILessonRepository } from "../../domain/repositories/ILessonRepository.js";
import type { ITypingSessionRepository } from "../../domain/repositories/ITypingSessionRepository.js";
import type { IUserProfileRepository } from "../../domain/repositories/IUserProfileRepository.js";
import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { TypingSession } from "../../domain/entities/TypingSession.js";
import {
  PracticePacingState,
  type PacingParams,
} from "../../domain/entities/PracticePacingState.js";
import {
  LessonNotFoundError,
  BreakRequiredError,
} from "../../domain/errors/DomainError.js";
import type {
  StartTypingSessionDTO,
  SessionCommandResponseDTO,
} from "../dtos/SessionDTOs.js";
import type { Clock } from "../dtos/PracticePacingDTOs.js";

export class StartTypingSession {
  constructor(
    private readonly sessionRepository: ITypingSessionRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly profileRepository: IUserProfileRepository,
    private readonly pacingRepository: IPracticePacingRepository,
    private readonly adminSettingsRepository: IAdminSettingsRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(
    dto: StartTypingSessionDTO,
  ): Promise<SessionCommandResponseDTO> {
    const userId = SessionId.create(dto.userId);
    const lesson = await this.lessonRepository.findById(
      SessionId.create(dto.lessonId),
    );
    if (!lesson) {
      throw new LessonNotFoundError("Lição não encontrada");
    }

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

    // RN33 - a lição em curso nunca é interrompida; a pausa vale ao criar a próxima sessão.
    const pacing =
      (await this.pacingRepository.findByUserId(userId)) ??
      PracticePacingState.create({ userId });
    const currentTime = this.now();
    if (pacing.isBreakRequired(currentTime, pacingParams)) {
      throw new BreakRequiredError(
        "Hora de descansar: faça uma pausa de pelo menos 3 minutos (alongue os braços, beba água e mexa as pernas) antes de iniciar a próxima lição",
      );
    }
    if (pacing.isNewBlockEligible(currentTime, pacingParams)) {
      await this.pacingRepository.save(
        pacing.startNewBlock(currentTime, pacingParams),
      );
    }

    const profile = await this.profileRepository.findByUserId(userId);
    const layout = profile?.activeLayout ?? lesson.layout;

    const session = TypingSession.create({
      userId,
      lessonId: lesson.id,
      layout,
    }).start();

    await this.sessionRepository.save(session);

    return { sessionId: session.id.value, state: session.state };
  }
}

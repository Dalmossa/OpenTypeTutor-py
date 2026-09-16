import type { CheckErgonomicSafety } from './CheckErgonomicSafety.js';
import type { IProgressCardRepository } from '../../domain/repositories/IProgressCardRepository.js';
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';
import { PedagogicalProgressionEngine } from '../../domain/services/PedagogicalProgressionEngine.js';
import type {
  StartFirstSessionInputDTO,
  StartFirstSessionResponseDTO,
} from '../dtos/ProgressCardDTOs.js';

export class StartFirstSession {
  constructor(
    private readonly checkErgonomicSafety: CheckErgonomicSafety,
    private readonly progressCardRepository: IProgressCardRepository,
    private readonly lessonRepository: ILessonRepository
  ) {}

  async execute(dto: StartFirstSessionInputDTO): Promise<StartFirstSessionResponseDTO> {
    // RN24/RN28 - check-in ergonômico obrigatório antes da primeira sessão
    const safety = await this.checkErgonomicSafety.execute({
      seatHeightOk: dto.seatHeightOk,
      lumbarSupportOk: dto.lumbarSupportOk,
      monitorAtEyeLevel: dto.monitorAtEyeLevel,
      wristSupportOk: dto.wristSupportOk,
      discomfortReported: dto.discomfortReported,
      ...(dto.discomfortDetail !== undefined ? { discomfortDetail: dto.discomfortDetail } : {}),
    });

    if (!safety.safe) {
      return {
        safe: false,
        alreadyStarted: false,
        lesson: null,
        progressCard: null,
        guidance: safety.guidance,
      };
    }

    const userId = SessionId.create(dto.userId);
    const engine = new PedagogicalProgressionEngine(await this.lessonRepository.findAll());
    const existing = await this.progressCardRepository.findLatestByUserId(userId);

    if (existing !== null) {
      const next = engine.getNextLesson(existing, true);
      return {
        safe: true,
        alreadyStarted: true,
        lesson: next.lesson?.toDTO() ?? null,
        progressCard: existing.toDTO(),
        guidance: 'Check-in já realizado anteriormente.',
      };
    }

    // RN25 - nova jornada começa na fase ERGONOMICS_SETUP, lição 1
    const firstLesson =
      engine.getFirstLessonOfPhase(PedagogicalPhase.create('ERGONOMICS_SETUP')) ??
      engine.getFirstLessonOfPhase(PedagogicalPhase.getAll()[0] ?? PedagogicalPhase.create('ERGONOMICS_SETUP'));

    return {
      safe: true,
      alreadyStarted: false,
      lesson: firstLesson?.toDTO() ?? null,
      progressCard: null,
      guidance: 'Check-in aprovado. Primeira sessão liberada.',
    };
  }
}
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { IProgressCardRepository } from '../../domain/repositories/IProgressCardRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { PedagogicalProgressionEngine } from '../../domain/services/PedagogicalProgressionEngine.js';
import type {
  SubmitProgressCardInputDTO,
  SubmitProgressCardResponseDTO,
} from '../dtos/ProgressCardDTOs.js';

export class SubmitProgressCard {
  constructor(
    private readonly progressCardRepository: IProgressCardRepository,
    private readonly lessonRepository: ILessonRepository
  ) {}

  // RN27 - Registra o cartão do progresso persistido entre sessões.
  // RN26 - A fronteira do currículo só avança quando o critério de avanço
  // (backspaces <= tentativa anterior, sem desconforto) é atingido novamente.
  async execute(dto: SubmitProgressCardInputDTO): Promise<SubmitProgressCardResponseDTO> {
    const userId = SessionId.create(dto.userId);
    const latest = await this.progressCardRepository.findLatestByUserId(userId);
    const engine = new PedagogicalProgressionEngine(await this.lessonRepository.findAll());

    if (latest === null) {
      const firstLesson = engine.getFirstLessonOfPhase(
        PedagogicalPhase.create('ERGONOMICS_SETUP')
      );
      const card = this.buildCard(userId, {
        phase: firstLesson?.pedagogicalPhase ?? PedagogicalPhase.create('ERGONOMICS_SETUP'),
        lessonNumber: firstLesson?.lessonInPhase ?? 1,
        previousBackspaceCount: 0,
        dto,
      });
      await this.progressCardRepository.save(card);
      return { progressCard: card.toDTO() };
    }

    const candidate = latest.repeatLesson(
      dto.currentBackspaceCount,
      [...dto.insecureKeys],
      dto.discomfortReported,
      dto.discomfortDetail,
      dto.nextSessionNote
    );

    let card = candidate;
    if (!dto.discomfortReported && candidate.canAdvance(true)) {
      const next = engine.getNextLesson(candidate, true);
      if (next.reason === 'advance' && next.lesson !== null && next.lesson.pedagogicalPhase !== null) {
        card = this.buildCard(userId, {
          phase: next.lesson.pedagogicalPhase,
          lessonNumber: next.lesson.lessonInPhase ?? candidate.lessonNumber,
          previousBackspaceCount: latest.currentBackspaceCount,
          dto,
        });
      }
    }

    await this.progressCardRepository.save(card);

    return { progressCard: card.toDTO() };
  }

  private buildCard(
    userId: SessionId,
    input: {
      phase: PedagogicalPhase;
      lessonNumber: number;
      previousBackspaceCount: number;
      dto: SubmitProgressCardInputDTO;
    }
  ): ProgressCard {
    return ProgressCard.create({
      userId,
      date: new Date(),
      phase: input.phase,
      lessonNumber: input.lessonNumber,
      insecureKeys: [...input.dto.insecureKeys],
      discomfortReported: input.dto.discomfortReported,
      ...(input.dto.discomfortDetail !== undefined
        ? { discomfortDetail: input.dto.discomfortDetail }
        : {}),
      nextSessionNote: input.dto.nextSessionNote,
      previousBackspaceCount: input.previousBackspaceCount,
      currentBackspaceCount: input.dto.currentBackspaceCount,
    });
  }
}
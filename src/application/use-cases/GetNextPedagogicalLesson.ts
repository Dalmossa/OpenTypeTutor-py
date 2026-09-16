import type { IProgressCardRepository } from '../../domain/repositories/IProgressCardRepository.js';
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';
import { PedagogicalProgressionEngine } from '../../domain/services/PedagogicalProgressionEngine.js';
import type {
  GetNextPedagogicalLessonInputDTO,
  GetNextPedagogicalLessonResponseDTO,
} from '../dtos/ProgressCardDTOs.js';

export class GetNextPedagogicalLesson {
  constructor(
    private readonly progressCardRepository: IProgressCardRepository,
    private readonly lessonRepository: ILessonRepository
  ) {}

  async execute(dto: GetNextPedagogicalLessonInputDTO): Promise<GetNextPedagogicalLessonResponseDTO> {
    const userId = SessionId.create(dto.userId);
    const engine = new PedagogicalProgressionEngine(await this.lessonRepository.findAll());
    const card = await this.progressCardRepository.findLatestByUserId(userId);
    const progressCard = card?.toDTO() ?? null;

    if (card === null) {
      return this.firstLesson(engine);
    }

    const result = engine.getNextLesson(card, dto.confirmsNoLookingAtKeyboard);
    return {
      lesson: result.lesson?.toDTO() ?? null,
      shouldVaryExercise: result.shouldVaryExercise,
      reason: result.reason,
      progressCard,
    };
  }

  // RN25 - Primeira chamada sem cartão: começa na fase ERGONOMICS_SETUP, lição 1
  private firstLesson(engine: PedagogicalProgressionEngine): GetNextPedagogicalLessonResponseDTO {
    const first = engine.getFirstLessonOfPhase(PedagogicalPhase.create('ERGONOMICS_SETUP'));
    if (first === null) {
      return { lesson: null, shouldVaryExercise: false, reason: 'no_lessons', progressCard: null };
    }
    return { lesson: first.toDTO(), shouldVaryExercise: false, reason: 'advance', progressCard: null };
  }
}
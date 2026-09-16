import type { IProgressRepository } from '../../domain/repositories/IProgressRepository.js';
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { ProgressionEngine } from '../../domain/services/ProgressionEngine.js';
import type { GetUserProgressResponseDTO } from '../dtos/ProgressDTOs.js';

export class GetUserProgress {
  constructor(
    private readonly progressRepository: IProgressRepository,
    private readonly lessonRepository: ILessonRepository
  ) {}

  async execute(userId: string): Promise<GetUserProgressResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const progress = await this.progressRepository.findByUserId(targetUserId);

    if (!progress) {
      return {
        currentLevel: 1,
        completedLessons: 0,
        lastCompletedAt: null,
        currentLesson: null,
        levelCompletionRate: 0,
      };
    }

    const availableLessons = await this.lessonRepository.findAll();
    const nextLesson = ProgressionEngine.getNextLesson(progress, availableLessons);
    const levelCompletionRate = ProgressionEngine.getLevelCompletionRate(progress, availableLessons);

    return {
      currentLevel: progress.currentLevel,
      completedLessons: progress.completedLessons,
      lastCompletedAt: progress.lastCompletedAt?.toISOString() ?? null,
      currentLesson: nextLesson?.toDTO() ?? null,
      levelCompletionRate,
    };
  }
}
import type { LessonDTO } from '../../domain/entities/Lesson.js';

export interface GetUserProgressResponseDTO {
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: string | null;
  currentLesson: LessonDTO | null;
  levelCompletionRate: number;
}

// RN31 - reset de progresso (mantém conta e layout, volta ao nível 1)
export interface ResetProgressResponseDTO {
  reset: true;
}
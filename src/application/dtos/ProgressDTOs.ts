import type { LessonDTO } from '../../domain/entities/Lesson.js';

export interface GetUserProgressResponseDTO {
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: string | null;
  currentLesson: LessonDTO | null;
  levelCompletionRate: number;
}
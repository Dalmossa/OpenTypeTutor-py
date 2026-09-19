import type { LessonPerformanceStatus } from '../../domain/services/LessonPerformanceEngine.js';

// RN32 - status visual por lição (GET /me/lessons/performance)
export interface LessonPerformanceDTO {
  lessonId: string;
  attempts: number;
  bestAccuracy: number;
  lastAccuracy: number;
  status: LessonPerformanceStatus;
}

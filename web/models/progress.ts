import type { LessonDTO } from '@/models/lesson';

export interface GetUserProgressDTO {
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: string | null;
  currentLesson: LessonDTO | null;
  levelCompletionRate: number;
}

export type MasteryState = 'UNKNOWN' | 'LEARNING' | 'CONSOLIDATING' | 'MASTERED' | 'WEAK';

export interface KeyPerformanceDTO {
  id: string;
  userId: string;
  logicalKey: string;
  layout: string;
  attempts: number;
  errors: number;
  averageLatencyMs: number;
  lastPracticedAt: string | null;
  consecutiveMasterySessions: number;
  regressionSessions: number;
  masteryState: MasteryState;
  errorRate: number;
  keyAccuracy: number;
  latencyScore: number;
  recencyScore: number;
  weakKeyScore: number;
}
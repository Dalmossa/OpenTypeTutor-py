import type { LessonDTO } from '@/models/lesson';

export interface GetUserProgressDTO {
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

// RN33 - estado de pacing consumido para surfacing de pausa (nenhuma RN no cliente)
export interface PracticeStatusDTO {
  accumulatedActiveMs: number;
  practiceBlockMs: number;
  minBreakMs: number;
  breakRequired: boolean;
  breakRemainingMs: number;
}
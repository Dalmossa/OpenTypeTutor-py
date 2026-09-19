export interface LessonDTO {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: 'GUIDED' | 'REINFORCEMENT' | 'FREE';
  type: 'INTRODUCTION' | 'PRACTICE' | 'REINFORCEMENT' | 'ASSESSMENT';
  layout: string;
  pedagogicalPhase: string | null;
  lessonInPhase: number | null;
}

// RN32 - status visual por lição, calculado no backend a partir das sessões COMPLETED.
export type LessonPerformanceStatus = 'NOT_STARTED' | 'MASTERED' | 'REVIEW' | 'PRACTICING';

export interface LessonPerformanceDTO {
  lessonId: string;
  attempts: number;
  bestAccuracy: number;
  lastAccuracy: number;
  status: LessonPerformanceStatus;
}
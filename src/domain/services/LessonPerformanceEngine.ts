import { adaptiveParams } from '../config/adaptiveParams.js';

export type LessonPerformanceStatus = 'NOT_STARTED' | 'MASTERED' | 'REVIEW' | 'PRACTICING';

export interface LessonPerformanceInput {
  attempts: number;
  bestAccuracy: number;
  lastAccuracy: number;
}

// RN32 - status visual por lição. Limiares centralizados em adaptiveParams (§26).
// Precedência: MASTERED (best ≥ 0.95) > REVIEW (≥2 tentativas e last < 0.60) > PRACTICING.
// REVIEW nunca é aplicado na primeira tentativa (guarda LESSON_REVIEW_MIN_ATTEMPTS).
export function computeLessonPerformanceStatus(input: LessonPerformanceInput): LessonPerformanceStatus {
  if (input.attempts === 0) {
    return 'NOT_STARTED';
  }

  if (input.bestAccuracy >= adaptiveParams.LESSON_MASTERY_ACCURACY) {
    return 'MASTERED';
  }

  if (
    input.attempts >= adaptiveParams.LESSON_REVIEW_MIN_ATTEMPTS &&
    input.lastAccuracy < adaptiveParams.LESSON_REVIEW_ACCURACY
  ) {
    return 'REVIEW';
  }

  return 'PRACTICING';
}
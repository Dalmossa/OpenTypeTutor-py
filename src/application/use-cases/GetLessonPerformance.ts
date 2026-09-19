import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import type { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import {
  computeLessonPerformanceStatus,
} from '../../domain/services/LessonPerformanceEngine.js';
import type { LessonPerformanceDTO } from '../dtos/LessonPerformanceDTOs.js';

interface LessonAggregate {
  attempts: number;
  best: number;
  last: number;
}

// RN32 - status visual por lição, calculado das sessões COMPLETED do usuário.
function byCompletedAt(a: TypingSession, b: TypingSession): number {
  return (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
}

export class GetLessonPerformance {
  constructor(private readonly sessionRepository: ITypingSessionRepository) {}

  async execute(userId: string): Promise<LessonPerformanceDTO[]> {
    const sessions = await this.sessionRepository.findCompletedByUserId(SessionId.create(userId));

    const byLesson = new Map<string, LessonAggregate>();
    // Ordena por completedAt para que "last" seja a sessão mais recente de forma determinística.
    for (const session of [...sessions].sort(byCompletedAt)) {
      const metrics = session.metrics;
      if (metrics === null || metrics.isInsufficientData()) {
        continue;
      }
      const lessonId = session.lessonId.value;
      const accuracy = metrics.accuracy;
      const entry = byLesson.get(lessonId);
      if (entry === undefined) {
        byLesson.set(lessonId, { attempts: 1, best: accuracy, last: accuracy });
      } else {
        entry.attempts += 1;
        entry.best = Math.max(entry.best, accuracy);
        entry.last = accuracy;
      }
    }

    const result: LessonPerformanceDTO[] = [...byLesson.keys()]
      .sort()
      .map((lessonId) => {
        const aggregate = byLesson.get(lessonId);
        if (aggregate === undefined) {
          throw new Error('Agregado de lição ausente');
        }
        return {
          lessonId,
          attempts: aggregate.attempts,
          bestAccuracy: aggregate.best,
          lastAccuracy: aggregate.last,
          status: computeLessonPerformanceStatus({
            attempts: aggregate.attempts,
            bestAccuracy: aggregate.best,
            lastAccuracy: aggregate.last,
          }),
        };
      });

    return result;
  }
}
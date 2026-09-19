import type { LessonDTO, LessonPerformanceDTO } from '@/models/lesson';
import type { ApiClient } from '@/services/api-client';

export class LessonController {
  constructor(private readonly api: ApiClient) {}

  async list(token: string): Promise<LessonDTO[]> {
    return this.api.listLessons(token);
  }

  async getById(id: string, token: string): Promise<LessonDTO> {
    return this.api.getLesson(id, token);
  }

  // RN32 - status visual por lição (NOT_STARTED/MASTERED/REVIEW/PRACTICING) calculado no backend.
  async getPerformance(token: string): Promise<LessonPerformanceDTO[]> {
    return this.api.getLessonPerformance(token);
  }
}
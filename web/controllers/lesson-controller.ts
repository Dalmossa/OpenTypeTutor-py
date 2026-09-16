import type { LessonDTO } from '@/models/lesson';
import type { ApiClient } from '@/services/api-client';

export class LessonController {
  constructor(private readonly api: ApiClient) {}

  async list(token: string): Promise<LessonDTO[]> {
    return this.api.listLessons(token);
  }

  async getById(id: string, token: string): Promise<LessonDTO> {
    return this.api.getLesson(id, token);
  }
}
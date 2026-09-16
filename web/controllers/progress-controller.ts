import type { GetUserProgressDTO, KeyPerformanceDTO } from '@/models/progress';
import type { ApiClient } from '@/services/api-client';

export class ProgressController {
  constructor(private readonly api: ApiClient) {}

  async getProgress(token: string): Promise<GetUserProgressDTO> {
    return this.api.getProgress(token);
  }

  async getKeyPerformance(token: string): Promise<KeyPerformanceDTO[]> {
    return this.api.getKeyPerformance(token);
  }
}
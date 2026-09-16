import type { ApiClient } from '@/services/api-client';
import type {
  ErgonomicCheckDTO,
  ErgonomicCheckResponseDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardDTO,
  SubmitProgressCardResponseDTO,
} from '@/models/pedagogical';

export class PedagogicalController {
  constructor(private readonly api: ApiClient) {}

  async getNextLesson(token: string, confirmsNoLookingAtKeyboard = true): Promise<GetNextPedagogicalLessonResponseDTO> {
    return this.api.getNextPedagogicalLesson(confirmsNoLookingAtKeyboard, token);
  }

  async submitProgressCard(data: SubmitProgressCardDTO, token: string): Promise<SubmitProgressCardResponseDTO> {
    return this.api.submitProgressCard(data, token);
  }

  async ergonomicCheck(data: ErgonomicCheckDTO, token: string): Promise<ErgonomicCheckResponseDTO> {
    return this.api.ergonomicCheck(data, token);
  }
}
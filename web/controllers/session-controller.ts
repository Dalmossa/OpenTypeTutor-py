import type { ApiClient } from '@/services/api-client';
import type {
  KeystrokeEventDTO,
  SessionCommandResponseDTO,
  StartSessionResponseDTO,
  SubmitSessionResponseDTO,
} from '@/models/session';
import type { PracticeStatusDTO } from '@/models/progress';

export class SessionController {
  constructor(private readonly api: ApiClient) {}

  async start(lessonId: string, token: string): Promise<StartSessionResponseDTO> {
    return this.api.startSession({ lessonId }, token);
  }

  // RN33 - consulta o estado de pacing; se houver pausa pendente, o servidor
  // informa breakRequired + breakRemainingMs (já deduzidos). A regra também é
  // reaplicada pelo backend (BREAK_REQUIRED 409) em caso de falha/ignorar.
  async getPracticeStatus(token: string): Promise<PracticeStatusDTO> {
    return this.api.getPracticeStatus(token);
  }

  async pause(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.api.pauseSession(sessionId, token);
  }

  async resume(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.api.resumeSession(sessionId, token);
  }

  async abandon(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.api.abandonSession(sessionId, token);
  }

  async submit(sessionId: string, keystrokes: KeystrokeEventDTO[], token: string): Promise<SubmitSessionResponseDTO> {
    return this.api.submitSession(sessionId, { keystrokes }, token);
  }
}
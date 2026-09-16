import type { ApiClient } from '@/services/api-client';
import type {
  KeystrokeEventDTO,
  SessionCommandResponseDTO,
  StartSessionResponseDTO,
  SubmitSessionResponseDTO,
} from '@/models/session';

export class SessionController {
  constructor(private readonly api: ApiClient) {}

  async start(lessonId: string, token: string): Promise<StartSessionResponseDTO> {
    return this.api.startSession({ lessonId }, token);
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
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';
import type { SessionMetricsProps } from '../../domain/entities/SessionMetrics.js';

export interface StartTypingSessionDTO {
  userId: string;
  lessonId: string;
}

export interface SessionCommandDTO {
  userId: string;
  sessionId: string;
}

export interface SessionCommandResponseDTO {
  sessionId: string;
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
}

export interface SubmitTypingSessionDTO {
  userId: string;
  sessionId: string;
  keystrokes: KeystrokeEventProps[];
}

export interface SubmitTypingSessionResponseDTO {
  sessionId: string;
  state: 'COMPLETED';
  metrics: SessionMetricsProps;
}
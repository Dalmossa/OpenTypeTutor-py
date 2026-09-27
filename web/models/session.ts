export interface StartSessionDTO {
  lessonId: string;
}

export interface StartSessionResponseDTO {
  sessionId: string;
  state: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED" | "ABANDONED";
}

export type SessionState = StartSessionResponseDTO["state"];

export interface SessionCommandResponseDTO {
  sessionId: string;
  state: SessionState;
}

export type EventType =
  "CORRECT" | "INCORRECT" | "CORRECTION" | "DEAD_KEY_COMPOSE";

export interface KeystrokeEventDTO {
  expectedKey: string;
  typedKey: string | null;
  physicalKey: string;
  logicalKey: string;
  eventType: EventType;
  timestampMs: number;
  latencyMs: number | null;
  composedCharacter: string | null;
}

export interface SubmitSessionDTO {
  keystrokes: KeystrokeEventDTO[];
}

export interface SessionMetricsDTO {
  charactersTyped: number;
  correctCharacters: number;
  incorrectCharacters: number;
  correctedErrors: number;
  finalUncorrectedErrors: number;
  accuracy: number;
  grossWpm: number;
  netWpm: number;
  activeDurationMs: number;
  averageLatencyMs: number;
  /**
   * RN22 - decided pelo backend (`adaptiveParams.INSUFFICIENT_DATA_*`).
   *
   * Antes este campo não existia e a tela rederivava a regra com literais
   * próprios (`activeDurationMs < 3000 || charactersTyped < 5`). A cópia só
   * permanecia correta enquanto ninguém mudasse os limiares no backend — a
   * tela e o banco podiam discordar sem nenhum teste acusar.
   */
  insufficientData: boolean;
}

export interface SubmitSessionResponseDTO {
  sessionId: string;
  state: "COMPLETED";
  metrics: SessionMetricsDTO;
}

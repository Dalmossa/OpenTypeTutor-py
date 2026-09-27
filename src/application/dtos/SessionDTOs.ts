import type { KeystrokeEventProps } from "../../domain/entities/KeystrokeEvent.js";
import type { SessionMetricsProps } from "../../domain/entities/SessionMetrics.js";

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
  state: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED" | "ABANDONED";
}

export interface SubmitTypingSessionDTO {
  userId: string;
  sessionId: string;
  keystrokes: KeystrokeEventProps[];
}

/**
 * Métricas como vão no fio (RN22).
 *
 * `SessionMetricsProps` é o que o repositório persiste, e fica de fora de propósito:
 * a flag é **derivada** de `activeDurationMs`/`charactersTyped`, não armazenada. Salvá-la
 * criaria um segundo valor guardado que pode divergir dos dois campos de onde deriva
 * (uma migração de metadados, um UPDATE parcial, um restore de backup). Derivando na
 * reidratação, o round-trip pelo banco não tem como dessincronizar.
 *
 * No fio ela entra porque o cliente precisa da decisão, e antes desta distinção ele
 * reimplementava a RN22 com literais (`< 3000 || < 5`) no `typing-interface.tsx` — uma
 * cópia da regra que só continuaria correta enquanto ninguém mexesse em
 * `adaptiveParams`.
 */
export interface SessionMetricsDTO extends SessionMetricsProps {
  insufficientData: boolean;
}

export interface SubmitTypingSessionResponseDTO {
  sessionId: string;
  state: "COMPLETED";
  metrics: SessionMetricsDTO;
}

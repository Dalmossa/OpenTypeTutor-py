import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import type { KeystrokeEvent } from './KeystrokeEvent.js';
import type { SessionMetrics } from './SessionMetrics.js';

export type SessionState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';

interface TypingSessionInternalProps {
  id?: SessionId;
  userId: SessionId;
  lessonId: SessionId;
  layout: Layout;
  state?: SessionState;
  startedAt?: Date | null;
  completedAt?: Date | null;
  activeDurationMs?: number;
  metrics?: SessionMetrics | null;
  keystrokes?: KeystrokeEvent[];
  pausedAt?: Date | null;
  totalPausedDurationMs?: number;
}

const VALID_STATES: SessionState[] = ['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'ABANDONED'];

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  IDLE: ['RUNNING'],
  RUNNING: ['PAUSED', 'COMPLETED', 'ABANDONED'],
  PAUSED: ['RUNNING', 'COMPLETED', 'ABANDONED'],
  COMPLETED: [],
  ABANDONED: [],
};

export class TypingSession {
  readonly id: SessionId;
  readonly userId: SessionId;
  readonly lessonId: SessionId;
  readonly layout: Layout;
  readonly state: SessionState;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly activeDurationMs: number;
  readonly metrics: SessionMetrics | null;
  readonly keystrokes: KeystrokeEvent[];
  private readonly pausedAt: Date | null;
  private readonly totalPausedDurationMs: number;

  private constructor(props: TypingSessionInternalProps) {
    this.id = props.id ?? SessionId.create();
    this.userId = props.userId;
    this.lessonId = props.lessonId;
    this.layout = props.layout;
    this.state = props.state ?? 'IDLE';
    this.startedAt = props.startedAt ?? null;
    this.completedAt = props.completedAt ?? null;
    this.activeDurationMs = props.activeDurationMs ?? 0;
    this.metrics = props.metrics ?? null;
    this.keystrokes = props.keystrokes ?? [];
    this.pausedAt = props.pausedAt ?? null;
    this.totalPausedDurationMs = props.totalPausedDurationMs ?? 0;
  }

  static create(props: Omit<TypingSessionInternalProps, 'id' | 'state' | 'startedAt' | 'completedAt' | 'activeDurationMs' | 'metrics' | 'keystrokes' | 'pausedAt' | 'totalPausedDurationMs'>): TypingSession {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (!(props.lessonId instanceof SessionId)) {
      throw new Error('lessonId inválido');
    }

    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }

    return new TypingSession({
      ...props,
      state: 'IDLE',
      startedAt: null,
      completedAt: null,
      activeDurationMs: 0,
      metrics: null,
      keystrokes: [],
      pausedAt: null,
      totalPausedDurationMs: 0,
    });
  }

  static reconstruct(props: TypingSessionProps): TypingSession {
    if (!(props.id instanceof SessionId)) {
      throw new Error('id inválido');
    }

    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (!(props.lessonId instanceof SessionId)) {
      throw new Error('lessonId inválido');
    }

    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }

    if (!VALID_STATES.includes(props.state)) {
      throw new Error('Estado inválido');
    }

    if (props.activeDurationMs < 0) {
      throw new Error('Active duration não pode ser negativo');
    }

    return new TypingSession({
      id: props.id,
      userId: props.userId,
      lessonId: props.lessonId,
      layout: props.layout,
      state: props.state,
      startedAt: props.startedAt,
      completedAt: props.completedAt,
      activeDurationMs: props.activeDurationMs,
      metrics: props.metrics,
      keystrokes: [...props.keystrokes],
      pausedAt: props.pausedAt,
      totalPausedDurationMs: props.totalPausedDurationMs,
    });
  }

  private transitionTo(newState: SessionState): TypingSession {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(newState)) {
      throw new Error('Transição inválida');
    }

    const now = new Date();
    let startedAt = this.startedAt;
    let completedAt = this.completedAt;
    let activeDurationMs = this.activeDurationMs;
    let pausedAt = this.pausedAt;
    let totalPausedDurationMs = this.totalPausedDurationMs;

    switch (newState) {
      case 'RUNNING':
        if (this.state === 'IDLE') {
          startedAt = now;
        } else if (this.state === 'PAUSED' && this.pausedAt) {
          // Add paused duration to total
          totalPausedDurationMs += now.getTime() - this.pausedAt.getTime();
          pausedAt = null;
        }
        break;

      case 'PAUSED':
        if (this.state === 'RUNNING') {
          pausedAt = now;
        }
        break;

      case 'COMPLETED':
      case 'ABANDONED':
        if (this.state === 'RUNNING') {
          activeDurationMs = now.getTime() - (startedAt?.getTime() ?? now.getTime()) - totalPausedDurationMs;
        } else if (this.state === 'PAUSED' && this.pausedAt) {
          totalPausedDurationMs += now.getTime() - this.pausedAt.getTime();
          activeDurationMs = (this.pausedAt.getTime() - (startedAt?.getTime() ?? now.getTime())) - (totalPausedDurationMs - (now.getTime() - this.pausedAt.getTime()));
          pausedAt = null;
        }
        completedAt = now;
        break;
    }

    return new TypingSession({
      id: this.id,
      userId: this.userId,
      lessonId: this.lessonId,
      layout: this.layout,
      state: newState,
      startedAt,
      completedAt,
      activeDurationMs: Math.max(0, activeDurationMs),
      metrics: this.metrics,
      keystrokes: this.keystrokes,
      pausedAt,
      totalPausedDurationMs,
    });
  }

  start(): TypingSession {
    if (this.state !== 'IDLE') {
      throw new Error('Transição inválida');
    }
    return this.transitionTo('RUNNING');
  }

  pause(): TypingSession {
    if (this.state !== 'RUNNING') {
      throw new Error('Transição inválida');
    }
    return this.transitionTo('PAUSED');
  }

  resume(): TypingSession {
    if (this.state !== 'PAUSED') {
      throw new Error('Transição inválida');
    }
    return this.transitionTo('RUNNING');
  }

  complete(metrics: SessionMetrics): TypingSession {
    if (this.state === 'COMPLETED') {
      // RN14 - Idempotent: return same session with existing metrics
      return this;
    }
    if (this.state !== 'RUNNING' && this.state !== 'PAUSED') {
      throw new Error('Transição inválida');
    }
    const newSession = this.transitionTo('COMPLETED');
    return new TypingSession({
      id: newSession.id,
      userId: newSession.userId,
      lessonId: newSession.lessonId,
      layout: newSession.layout,
      state: newSession.state,
      startedAt: newSession.startedAt,
      completedAt: newSession.completedAt,
      activeDurationMs: newSession.activeDurationMs,
      metrics,
      keystrokes: newSession.keystrokes,
      pausedAt: newSession.pausedAt,
      totalPausedDurationMs: newSession.totalPausedDurationMs,
    });
  }

  abandon(): TypingSession {
    if (this.state !== 'RUNNING' && this.state !== 'PAUSED') {
      throw new Error('Transição inválida');
    }
    return this.transitionTo('ABANDONED');
  }

  setMetrics(metrics: SessionMetrics): TypingSession {
    if (this.state !== 'COMPLETED') {
      throw new Error('Métricas só podem ser definidas em sessão COMPLETED');
    }
    return new TypingSession({
      id: this.id,
      userId: this.userId,
      lessonId: this.lessonId,
      layout: this.layout,
      state: this.state,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      activeDurationMs: this.activeDurationMs,
      metrics,
      keystrokes: this.keystrokes,
      pausedAt: this.pausedAt,
      totalPausedDurationMs: this.totalPausedDurationMs,
    });
  }

  addKeystroke(keystroke: KeystrokeEvent): TypingSession {
    if (this.state !== 'RUNNING') {
      throw new Error('Sessão não está em andamento');
    }
    return new TypingSession({
      id: this.id,
      userId: this.userId,
      lessonId: this.lessonId,
      layout: this.layout,
      state: this.state,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      activeDurationMs: this.activeDurationMs,
      metrics: this.metrics,
      keystrokes: [...this.keystrokes, keystroke],
      pausedAt: this.pausedAt,
      totalPausedDurationMs: this.totalPausedDurationMs,
    });
  }

  recordKeystrokes(keystrokes: KeystrokeEvent[]): TypingSession {
    if (this.state !== 'RUNNING' && this.state !== 'PAUSED') {
      throw new Error('Sessão não está em andamento');
    }
    return new TypingSession({
      id: this.id,
      userId: this.userId,
      lessonId: this.lessonId,
      layout: this.layout,
      state: this.state,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      activeDurationMs: this.activeDurationMs,
      metrics: this.metrics,
      keystrokes: [...this.keystrokes, ...keystrokes],
      pausedAt: this.pausedAt,
      totalPausedDurationMs: this.totalPausedDurationMs,
    });
  }

  equals(other: TypingSession): boolean {
    return this.id.equals(other.id);
  }

  toJSON(): TypingSessionProps {
    return {
      id: this.id,
      userId: this.userId,
      lessonId: this.lessonId,
      layout: this.layout,
      state: this.state,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      activeDurationMs: this.activeDurationMs,
      metrics: this.metrics,
      keystrokes: this.keystrokes,
      pausedAt: this.pausedAt,
      totalPausedDurationMs: this.totalPausedDurationMs,
    };
  }
}

export interface TypingSessionProps {
  id: SessionId;
  userId: SessionId;
  lessonId: SessionId;
  layout: Layout;
  state: SessionState;
  startedAt: Date | null;
  completedAt: Date | null;
  activeDurationMs: number;
  metrics: SessionMetrics | null;
  keystrokes: KeystrokeEvent[];
  pausedAt: Date | null;
  totalPausedDurationMs: number;
}
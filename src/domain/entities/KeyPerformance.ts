import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import { adaptiveParams } from '../config/adaptiveParams.js';

export type MasteryState = 'UNKNOWN' | 'LEARNING' | 'CONSOLIDATING' | 'MASTERED' | 'WEAK';

export interface KeyPerformanceProps {
  id?: SessionId;
  userId: SessionId;
  logicalKey: string;
  layout: Layout;
  attempts?: number;
  errors?: number;
  averageLatencyMs?: number;
  lastPracticedAt?: Date | null;
  consecutiveMasterySessions?: number;
  regressionSessions?: number;
  masteryState?: MasteryState;
}

export interface KeyPerformanceDTO {
  id: string;
  userId: string;
  logicalKey: string;
  layout: string;
  attempts: number;
  errors: number;
  averageLatencyMs: number;
  lastPracticedAt: string | null;
  consecutiveMasterySessions: number;
  regressionSessions: number;
  masteryState: MasteryState;
  errorRate: number;
  keyAccuracy: number;
  latencyScore: number;
  recencyScore: number;
  weakKeyScore: number;
}

interface KeyPerformanceInternalProps {
  id: SessionId;
  userId: SessionId;
  logicalKey: string;
  layout: Layout;
  attempts: number;
  errors: number;
  averageLatencyMs: number;
  lastPracticedAt: Date | null;
  consecutiveMasterySessions: number;
  regressionSessions: number;
  masteryState: MasteryState;
}

const LATENCY_REFERENCE = adaptiveParams.LATENCY_REFERENCE_MS;
const MASTERY_ATTEMPTS = adaptiveParams.MASTERY_ATTEMPTS;
const MASTERY_CONSECUTIVE_SESSIONS = adaptiveParams.MASTERY_CONSECUTIVE_SESSIONS;
const UNKNOWN_ATTEMPTS = adaptiveParams.UNKNOWN_ATTEMPTS;
const WEAK_THRESHOLD = adaptiveParams.WEAK_THRESHOLD;
const CONSOLIDATING_THRESHOLD = adaptiveParams.CONSOLIDATING_THRESHOLD;
const RECENCY_LAMBDA = adaptiveParams.RECENCY_LAMBDA;

// Formula constants from PRD §16.5
const WEAK_KEY_SCORE_WEIGHTS = {
  ERROR_RATE: 0.50,
  LATENCY_SCORE: 0.30,
  RECENCY_SCORE: 0.20,
} as const;

export class KeyPerformance {
  readonly id: SessionId;
  readonly userId: SessionId;
  readonly logicalKey: string;
  readonly layout: Layout;
  readonly attempts: number;
  readonly errors: number;
  readonly averageLatencyMs: number;
  readonly lastPracticedAt: Date | null;
  readonly consecutiveMasterySessions: number;
  readonly regressionSessions: number;
  readonly masteryState: MasteryState;

  private constructor(props: KeyPerformanceInternalProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.logicalKey = props.logicalKey;
    this.layout = props.layout;
    this.attempts = props.attempts;
    this.errors = props.errors;
    this.averageLatencyMs = props.averageLatencyMs;
    this.lastPracticedAt = props.lastPracticedAt;
    this.consecutiveMasterySessions = props.consecutiveMasterySessions;
    this.regressionSessions = props.regressionSessions;
    this.masteryState = props.masteryState;
  }

  static create(props: KeyPerformanceProps): KeyPerformance {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }

    if (!props.logicalKey || props.logicalKey.length === 0) {
      throw new Error('logicalKey é obrigatório');
    }

    return new KeyPerformance({
      id: props.id ?? SessionId.create(),
      userId: props.userId,
      logicalKey: props.logicalKey,
      layout: props.layout,
      attempts: props.attempts ?? 0,
      errors: props.errors ?? 0,
      averageLatencyMs: props.averageLatencyMs ?? 0,
      lastPracticedAt: props.lastPracticedAt ?? null,
      consecutiveMasterySessions: props.consecutiveMasterySessions ?? 0,
      regressionSessions: props.regressionSessions ?? 0,
      masteryState: props.masteryState ?? 'UNKNOWN',
    });
  }

  private static createFromInternal(props: KeyPerformanceInternalProps): KeyPerformance {
    return new KeyPerformance(props);
  }

  /** @internal For testing only - reconstruct entity with specific state */
  static reconstruct(props: KeyPerformanceInternalProps): KeyPerformance {
    return new KeyPerformance(props);
  }

  get errorRate(): number {
    if (this.attempts === 0) return 0;
    return this.errors / this.attempts;
  }

  get keyAccuracy(): number {
    return 1 - this.errorRate;
  }

  get latencyScore(): number {
    if (this.averageLatencyMs === 0) return 0;
    return Math.min(1, this.averageLatencyMs / LATENCY_REFERENCE);
  }

  get recencyScore(): number {
    if (!this.lastPracticedAt) return 1;
    const daysSinceLastPractice = (Date.now() - this.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);
    return 1 - Math.exp(-RECENCY_LAMBDA * daysSinceLastPractice);
  }

  get weakKeyScore(): number {
    return (
      WEAK_KEY_SCORE_WEIGHTS.ERROR_RATE * this.errorRate +
      WEAK_KEY_SCORE_WEIGHTS.LATENCY_SCORE * this.latencyScore +
      WEAK_KEY_SCORE_WEIGHTS.RECENCY_SCORE * this.recencyScore
    );
  }

  private calculateMasteryState(): MasteryState {
    // RN08: attempts < 5 -> UNKNOWN
    if (this.attempts < UNKNOWN_ATTEMPTS) {
      return 'UNKNOWN';
    }

    // RN09: Check if MASTERED
    if (this.masteryState === 'MASTERED') {
      return 'MASTERED';
    }

    // Check mastery criteria
    if (this.attempts >= MASTERY_ATTEMPTS && this.consecutiveMasterySessions >= MASTERY_CONSECUTIVE_SESSIONS) {
      return 'MASTERED';
    }

    // Classify by WeakKeyScore
    if (this.weakKeyScore >= WEAK_THRESHOLD) {
      return 'WEAK';
    }
    if (this.weakKeyScore >= CONSOLIDATING_THRESHOLD) {
      return 'CONSOLIDATING';
    }
    return 'LEARNING';
  }

  recordAttempt(attempt: { isError: boolean; latencyMs: number }): KeyPerformance {
    const newAttempts = this.attempts + 1;
    const newErrors = this.errors + (attempt.isError ? 1 : 0);

    // Update average latency (only for non-control keys, but we assume valid latency here)
    const totalLatency = this.averageLatencyMs * this.attempts + attempt.latencyMs;
    const newAverageLatencyMs = Math.round(totalLatency / newAttempts);

    const newProps: KeyPerformanceInternalProps = {
      ...this.toInternalProps(),
      attempts: newAttempts,
      errors: newErrors,
      averageLatencyMs: newAverageLatencyMs,
      lastPracticedAt: new Date(),
    };

    const newKp = KeyPerformance.createFromInternal(newProps);
    // Recalculate mastery state after attempt
    return newKp.withMasteryState(newKp.calculateMasteryState());
  }

  recordSessionEnd(isMasteryApproved: boolean): KeyPerformance {
    let newConsecutiveMasterySessions = this.consecutiveMasterySessions;
    let newRegressionSessions = this.regressionSessions;

    if (this.masteryState === 'MASTERED') {
      // RN10: Regression counter for MASTERED keys
      if (isMasteryApproved) {
        newRegressionSessions = 0; // Reset on approved session
      } else {
        newRegressionSessions += 1;
        // Check for regression (3 consecutive non-approved)
        if (newRegressionSessions >= 3) {
          // Regress - calculate new state based on WeakKeyScore
          const newProps = this.toInternalProps();
          newProps.regressionSessions = 0;
          newProps.masteryState = 'LEARNING'; // Will be recalculated
          const regressedKp = KeyPerformance.createFromInternal(newProps);
          return regressedKp.withMasteryState(regressedKp.calculateMasteryState());
        }
      }
    } else {
      // RN09: Mastery progression counter
      if (isMasteryApproved) {
        newConsecutiveMasterySessions += 1;
        newRegressionSessions = 0;
      } else {
        newConsecutiveMasterySessions = 0; // Reset on non-approved
      }

      // Check for mastery promotion
      if (newConsecutiveMasterySessions >= MASTERY_CONSECUTIVE_SESSIONS && this.attempts >= MASTERY_ATTEMPTS) {
        const newProps = this.toInternalProps();
        newProps.consecutiveMasterySessions = 0;
        newProps.masteryState = 'MASTERED';
        return KeyPerformance.createFromInternal(newProps);
      }
    }

    const newProps: KeyPerformanceInternalProps = {
      ...this.toInternalProps(),
      consecutiveMasterySessions: newConsecutiveMasterySessions,
      regressionSessions: newRegressionSessions,
    };

    return KeyPerformance.createFromInternal(newProps);
  }

  private withMasteryState(state: MasteryState): KeyPerformance {
    return KeyPerformance.createFromInternal({
      ...this.toInternalProps(),
      masteryState: state,
    });
  }

  private toInternalProps(): KeyPerformanceInternalProps {
    return {
      id: this.id,
      userId: this.userId,
      logicalKey: this.logicalKey,
      layout: this.layout,
      attempts: this.attempts,
      errors: this.errors,
      averageLatencyMs: this.averageLatencyMs,
      lastPracticedAt: this.lastPracticedAt,
      consecutiveMasterySessions: this.consecutiveMasterySessions,
      regressionSessions: this.regressionSessions,
      masteryState: this.masteryState,
    };
  }

  toProps(): KeyPerformanceInternalProps {
    return this.toInternalProps();
  }

  equals(other: KeyPerformance): boolean {
    return this.userId.equals(other.userId) &&
      this.logicalKey === other.logicalKey &&
      this.layout.equals(other.layout);
  }

  toDTO(): KeyPerformanceDTO {
    return {
      id: this.id.value,
      userId: this.userId.value,
      logicalKey: this.logicalKey,
      layout: this.layout.value,
      attempts: this.attempts,
      errors: this.errors,
      averageLatencyMs: this.averageLatencyMs,
      lastPracticedAt: this.lastPracticedAt?.toISOString() ?? null,
      consecutiveMasterySessions: this.consecutiveMasterySessions,
      regressionSessions: this.regressionSessions,
      masteryState: this.masteryState,
      errorRate: this.errorRate,
      keyAccuracy: this.keyAccuracy,
      latencyScore: this.latencyScore,
      recencyScore: this.recencyScore,
      weakKeyScore: this.weakKeyScore,
    };
  }

  toJSON(): KeyPerformanceDTO {
    return this.toDTO();
  }
}
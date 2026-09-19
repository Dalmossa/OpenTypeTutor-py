import type { KeyPerformance } from '../entities/KeyPerformance.js';
import { adaptiveParams } from '../config/adaptiveParams.js';

export type MasteryProximityBand = 'longe' | 'em progresso' | 'próximo' | 'às vésperas';

// RN36 - MasteryProximityIndex: distância ao envelope da regra de mastery (RN09).
// MPI = w_acc·min(1, keyAccuracy/MASTERY_ACCURACY)
//     + w_lat·latTerm + w_streak·min(1, streak/MASTERY_CONSECUTIVE_SESSIONS)
//     + w_attempts·min(1, attempts/MASTERY_ATTEMPTS)
// com latTerm = 0 se averageLatencyMs = 0 (sem dados de latência não credita),
// senão clamp(1 − averageLatencyMs/MASTERY_LATENCY_MS, 0, 1). Σw = 1 (PRD §26).
// Monotônico e em [0,1]; satura em 1,0 conforme os 4 gates do RN09 são satisfeitos.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MasteryProximityIndex {
  static compute(kp: KeyPerformance): number {
    if (kp.attempts === 0) {
      // Tecla nunca praticada → distância máxima do envelope de mastery (RN09)
      return 0;
    }
    const accuracyTerm = Math.min(
      1,
      kp.keyAccuracy / adaptiveParams.MASTERY_ACCURACY
    );
    const latencyTerm =
      kp.averageLatencyMs === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, 1 - kp.averageLatencyMs / adaptiveParams.MASTERY_LATENCY_MS)
          );
    const streakTerm = Math.min(
      1,
      kp.consecutiveMasterySessions / adaptiveParams.MASTERY_CONSECUTIVE_SESSIONS
    );
    const attemptsTerm = Math.min(1, kp.attempts / adaptiveParams.MASTERY_ATTEMPTS);

    return (
      adaptiveParams.MPI_W_ACCURACY * accuracyTerm +
      adaptiveParams.MPI_W_LATENCY * latencyTerm +
      adaptiveParams.MPI_W_STREAK * streakTerm +
      adaptiveParams.MPI_W_ATTEMPTS * attemptsTerm
    );
  }

  // RN36 - faixas para a UI (nunca cor sozinha — rótulo junto)
  static band(score: number): MasteryProximityBand {
    if (score < adaptiveParams.MPI_BAND_FAR_THRESHOLD) return 'longe';
    if (score < adaptiveParams.MPI_BAND_CLOSE_THRESHOLD) return 'em progresso';
    if (score < adaptiveParams.MPI_BAND_VERGE_THRESHOLD) return 'próximo';
    return 'às vésperas';
  }
}
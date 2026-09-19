import { describe, expect, it } from 'vitest';
import { MasteryProximityIndex } from './MasteryProximityIndex.js';
import { KeyPerformance } from '../entities/KeyPerformance.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import { adaptiveParams } from '../config/adaptiveParams.js';

function key(overrides: {
  attempts?: number;
  errors?: number;
  averageLatencyMs?: number;
  consecutiveMasterySessions?: number;
}): KeyPerformance {
  return KeyPerformance.create({
    userId: SessionId.create(),
    logicalKey: 'a',
    layout: Layout.create('ABNT2'),
    attempts: overrides.attempts ?? 0,
    errors: overrides.errors ?? 0,
    averageLatencyMs: overrides.averageLatencyMs ?? 0,
    consecutiveMasterySessions: overrides.consecutiveMasterySessions ?? 0,
  });
}

describe('RN36 - MasteryProximityIndex', () => {
  it('RN36 - MPI satura em 1,0 conforme a latência tende a 0 com os 4 gates do RN09 satisfeitos', () => {
    // Gates RN09: acc ≥ 95% | attempts ≥ 30 | avgLatency ≤ 500ms | streak ≥ 3
    const masterCandidate = key({
      attempts: 30,
      errors: 0,
      averageLatencyMs: 1,
      consecutiveMasterySessions: 3,
    });
    const mpi = MasteryProximityIndex.compute(masterCandidate);
    expect(mpi).toBeLessThanOrEqual(1);
    expect(mpi).toBeGreaterThan(0.99);
    expect(mpi).toBeGreaterThan(adaptiveParams.MPI_BAND_VERGE_THRESHOLD);
  });

  it('RN36 - MPI não atinge 1,0 quando qualquer gate do RN09 falha', () => {
    const missingStreak = key({
      attempts: 30,
      errors: 0,
      averageLatencyMs: 1,
      consecutiveMasterySessions: 2,
    });
    const missingAttempts = key({
      attempts: 29,
      errors: 0,
      averageLatencyMs: 1,
      consecutiveMasterySessions: 3,
    });
    const missingAccuracy = key({
      attempts: 30,
      errors: 2, // accuracy = 93,3% < 95%
      averageLatencyMs: 1,
      consecutiveMasterySessions: 3,
    });
    const missingLatencyGate = key({
      attempts: 30,
      errors: 0,
      averageLatencyMs: 1000,
      consecutiveMasterySessions: 3,
    });

    for (const kp of [missingStreak, missingAttempts, missingAccuracy, missingLatencyGate]) {
      expect(MasteryProximityIndex.compute(kp)).toBeLessThan(1);
    }
  });

  it('RN36 - latTerm é 0 quando averageLatencyMs é 0 (sem dados de latência não credita)', () => {
    const noLatency = key({
      attempts: 30,
      errors: 0,
      averageLatencyMs: 0,
      consecutiveMasterySessions: 3,
    });
    // MPI = w_acc·1 + w_lat·0 + w_streak·1 + w_attempts·1 = 0.75
    expect(MasteryProximityIndex.compute(noLatency)).toBeCloseTo(0.75, 10);
  });

  it('RN36 - MPI é monotônico: melhora em qualquer dimensão não reduz o índice', () => {
    const base = key({
      attempts: 20,
      errors: 4,
      averageLatencyMs: 600,
      consecutiveMasterySessions: 1,
    });
    const baseMpi = MasteryProximityIndex.compute(base);

    const betterAccuracy = key({ attempts: 20, errors: 0, averageLatencyMs: 600, consecutiveMasterySessions: 1 });
    const betterLatency = key({ attempts: 20, errors: 4, averageLatencyMs: 200, consecutiveMasterySessions: 1 });
    const betterStreak = key({ attempts: 20, errors: 4, averageLatencyMs: 600, consecutiveMasterySessions: 2 });
    const betterAttempts = key({ attempts: 25, errors: 4, averageLatencyMs: 600, consecutiveMasterySessions: 1 });

    for (const kp of [betterAccuracy, betterLatency, betterStreak, betterAttempts]) {
      expect(MasteryProximityIndex.compute(kp)).toBeGreaterThanOrEqual(baseMpi);
    }
  });

  it('RN36 - pesos somam 1 (Σ w = 1) e MPI ∈ [0,1]', () => {
    const sum =
      adaptiveParams.MPI_W_ACCURACY +
      adaptiveParams.MPI_W_LATENCY +
      adaptiveParams.MPI_W_STREAK +
      adaptiveParams.MPI_W_ATTEMPTS;
    expect(sum).toBeCloseTo(1, 10);

    const fresh = key({});
    expect(MasteryProximityIndex.compute(fresh)).toBe(0);
  });

  it('RN36 - band classifica o índice em longe/em progresso/próximo/às vésperas', () => {
    expect(MasteryProximityIndex.band(0.19)).toBe('longe');
    expect(MasteryProximityIndex.band(0.2)).toBe('em progresso');
    expect(MasteryProximityIndex.band(0.5)).toBe('próximo');
    expect(MasteryProximityIndex.band(0.8)).toBe('às vésperas');
    expect(MasteryProximityIndex.band(1)).toBe('às vésperas');
    expect(MasteryProximityIndex.band(0.49)).toBe('em progresso');
    expect(MasteryProximityIndex.band(0.79)).toBe('próximo');
  });
});
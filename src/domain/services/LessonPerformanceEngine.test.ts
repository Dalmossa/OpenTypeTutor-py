import { describe, it, expect } from 'vitest';
import { computeLessonPerformanceStatus } from './LessonPerformanceEngine.js';

describe('LessonPerformanceEngine (RN32)', () => {
  it('RN32 - sem tentativas → NOT_STARTED', () => {
    expect(computeLessonPerformanceStatus({ attempts: 0, bestAccuracy: 0, lastAccuracy: 0 })).toBe('NOT_STARTED');
  });

  it('RN32 - bestAccuracy ≥ 0.95 → MASTERED, mesmo com última tentativa fraca', () => {
    expect(computeLessonPerformanceStatus({ attempts: 3, bestAccuracy: 0.97, lastAccuracy: 0.5 })).toBe('MASTERED');
  });

  it('RN32 - attempts ≥ 2 e lastAccuracy < 0.60 → REVIEW', () => {
    expect(computeLessonPerformanceStatus({ attempts: 2, bestAccuracy: 0.8, lastAccuracy: 0.5 })).toBe('REVIEW');
  });

  it('RN32 - primeira tentativa abaixo de 0.60 não é REVIEW (guarda attempts ≥ 2)', () => {
    expect(computeLessonPerformanceStatus({ attempts: 1, bestAccuracy: 0.5, lastAccuracy: 0.5 })).toBe('PRACTICING');
  });

  it('RN32 - caso contrário → PRACTICING', () => {
    expect(computeLessonPerformanceStatus({ attempts: 2, bestAccuracy: 0.8, lastAccuracy: 0.7 })).toBe('PRACTICING');
  });
});
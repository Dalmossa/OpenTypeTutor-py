import { describe, it, expect } from 'vitest';
import { GetDashboardMastery } from './GetDashboardMastery.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { InMemoryKeyMasteryTransitionRepository } from '../../infrastructure/repositories/InMemoryKeyMasteryTransitionRepository.js';
import { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { KeyMasteryTransition } from '../../domain/entities/KeyMasteryTransition.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440052');
const ABNT2 = Layout.create('ABNT2');
const NOW = new Date('2024-01-15T12:00:00.000Z');

function key(state: NonNullable<Parameters<typeof KeyPerformance.create>[0]['masteryState']>, logicalKey: string): KeyPerformance {
  return KeyPerformance.create({
    userId: USER_ID,
    logicalKey,
    layout: ABNT2,
    attempts: 5,
    masteryState: state,
  });
}

describe('RN09/RN10/RN37 - GetDashboardMastery', () => {
  it('timeline de transições dentro da janela (90d) + distribuição atual por estado', async () => {
    const transitionRepository = new InMemoryKeyMasteryTransitionRepository();
    const keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    const mastery = new GetDashboardMastery(
      new InMemoryUserProfileRepository(),
      keyPerformanceRepository,
      transitionRepository,
      () => NOW
    );

    await transitionRepository.save(
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: ABNT2,
        date: '2024-01-05',
        from: 'LEARNING',
        to: 'CONSOLIDATING',
      })
    );
    await transitionRepository.save(
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: ABNT2,
        date: '2024-01-12',
        from: 'CONSOLIDATING',
        to: 'MASTERED',
      })
    );
    await transitionRepository.save(
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'b',
        layout: ABNT2,
        date: '2023-06-01',
        from: 'LEARNING',
        to: 'CONSOLIDATING',
      })
    );

    await keyPerformanceRepository.save(key('MASTERED', 'a'));
    await keyPerformanceRepository.save(key('CONSOLIDATING', 'b'));
    await keyPerformanceRepository.save(key('WEAK', 'c'));

    const result = await mastery.execute(USER_ID.value);

    expect(result.transitions.map((t) => t.logicalKey)).toEqual(['a', 'a']);
    expect(result.transitions[0]).toMatchObject({
      logicalKey: 'a',
      date: '2024-01-05',
      from: 'LEARNING',
      to: 'CONSOLIDATING',
    });
    expect(result.countsByState).toEqual({
      UNKNOWN: 0,
      LEARNING: 0,
      CONSOLIDATING: 1,
      MASTERED: 1,
      WEAK: 1,
    });
  });

  it('RN17 - timeline e contagens isoladas por userId', async () => {
    const transitionRepository = new InMemoryKeyMasteryTransitionRepository();
    const keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    const mastery = new GetDashboardMastery(
      new InMemoryUserProfileRepository(),
      keyPerformanceRepository,
      transitionRepository,
      () => NOW
    );

    const other = SessionId.create('550e8400-e29b-41d4-a716-446655440053');
    await transitionRepository.save(
      KeyMasteryTransition.create({
        userId: other,
        logicalKey: 'x',
        layout: ABNT2,
        date: '2024-01-05',
        from: 'LEARNING',
        to: 'MASTERED',
      })
    );
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: other,
        logicalKey: 'x',
        layout: ABNT2,
        masteryState: 'MASTERED',
      })
    );

    const result = await mastery.execute(USER_ID.value);

    expect(result.transitions).toHaveLength(0);
    expect(result.countsByState.MASTERED).toBe(0);
  });
});
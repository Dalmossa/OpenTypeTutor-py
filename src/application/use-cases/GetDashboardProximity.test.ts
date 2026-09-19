import { describe, it, expect } from 'vitest';
import { GetDashboardProximity } from './GetDashboardProximity.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440054');

function key(
  logicalKey: string,
  props: Partial<{
    attempts: number;
    errors: number;
    averageLatencyMs: number;
    consecutiveMasterySessions: number;
  }> = {},
  layout: Layout = Layout.create('ABNT2')
): KeyPerformance {
  return KeyPerformance.create({
    userId: USER_ID,
    logicalKey,
    layout,
    ...props,
  });
}

describe('RN36 - GetDashboardProximity', () => {
  it('lista teclas do layout ativo ordenadas por MPI ascendente (mais distante primeiro)', async () => {
    const keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    const proximity = new GetDashboardProximity(
      new InMemoryUserProfileRepository(),
      keyPerformanceRepository
    );

    await keyPerformanceRepository.save(
      key('a', { attempts: 5, errors: 0, averageLatencyMs: 100, consecutiveMasterySessions: 0 })
    );
    await keyPerformanceRepository.save(
      key('b', { attempts: 40, errors: 0, averageLatencyMs: 50, consecutiveMasterySessions: 3 })
    );
    await keyPerformanceRepository.save(
      key('c', { attempts: 0 }) // nunca praticada → MPI 0
    );

    const result = await proximity.execute(USER_ID.value);

    expect(result.keys).toHaveLength(3);
    expect(result.keys[0]?.logicalKey).toBe('c');
    expect(result.keys[0]?.mpi).toBe(0);
    expect(result.keys[0]?.band).toBe('longe');
    expect(result.keys.at(-1)?.logicalKey).toBe('b');
    expect(result.keys.at(-1)?.band).toBe('às vésperas');

    for (let i = 1; i < result.keys.length; i += 1) {
      const previous = result.keys[i - 1];
      const current = result.keys[i];
      if (previous !== undefined && current !== undefined) {
        expect(current.mpi).toBeGreaterThanOrEqual(previous.mpi);
      }
    }
  });

  it('RN11 - isola por layout ativo: teclas de outro layout não aparecem', async () => {
    const keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    const profileRepository = new InMemoryUserProfileRepository();
    const proximity = new GetDashboardProximity(profileRepository, keyPerformanceRepository);

    const us = Layout.create('US-INTERNATIONAL');
    await keyPerformanceRepository.save(key('a', {}, us));
    await keyPerformanceRepository.save(key('b', { attempts: 10 }, Layout.create('ABNT2')));

    const result = await proximity.execute(USER_ID.value);

    expect(result.keys.map((k) => k.logicalKey)).toEqual(['b']);
  });
});
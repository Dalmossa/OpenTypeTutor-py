import { describe, it, expect } from 'vitest';
import { GetDashboardHabits } from './GetDashboardHabits.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryDailyMetricsAggregateRepository } from '../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js';
import { DailyMetricsAggregate } from '../../domain/entities/DailyMetricsAggregate.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440050');
const ABNT2 = Layout.create('ABNT2');
const NOW = new Date('2024-01-15T12:00:00.000Z'); // America/Sao_Paulo → 2024-01-15

function aggregate(
  date: string,
  props: Partial<{
    sessionsCompleted: number;
    totalActiveMs: number;
    totalGrossChars: number;
    totalCorrectChars: number;
    totalErrors: number;
    totalLatencyMs: number;
    totalLatencySamples: number;
    keysPracticed: string[];
    keyCounts: Record<string, number>;
  }> = {}
): DailyMetricsAggregate {
  return DailyMetricsAggregate.create({ userId: USER_ID, layout: ABNT2, date, ...props });
}

function buildUseCase(): {
  habits: GetDashboardHabits;
  aggregateRepository: InMemoryDailyMetricsAggregateRepository;
} {
  const aggregateRepository = new InMemoryDailyMetricsAggregateRepository();
  const habits = new GetDashboardHabits(
    new InMemoryUserProfileRepository(),
    aggregateRepository,
    () => NOW
  );
  return { habits, aggregateRepository };
}

describe('RN34/RN35/RN37 - GetDashboardHabits', () => {
  it('RN35 - série diária cobre a janela de 90 dias com zero-fill nos dias sem prática', async () => {
    const { habits, aggregateRepository } = buildUseCase();
    await aggregateRepository.save(
      aggregate('2024-01-10', {
        sessionsCompleted: 2,
        totalActiveMs: 60000,
        totalGrossChars: 100,
        totalCorrectChars: 90,
        totalLatencyMs: 2000,
        totalLatencySamples: 100,
        keysPracticed: ['a', 'b'],
        keyCounts: { a: 5, b: 5 },
      })
    );

    const result = await habits.execute(USER_ID.value);

    expect(result.trend).toHaveLength(90);
    expect(result.trend[0]?.date).toBe('2023-10-18'); // 90 dias atrás (inclusive)
    expect(result.trend.at(-1)?.date).toBe('2024-01-15');

    const jan10 = result.trend.find((point) => point.date === '2024-01-10');
    expect(jan10?.sessionsCompleted).toBe(2);
    expect(jan10?.netWpm).toBe(18); // 90/5 / (60s / 60s)
    expect(jan10?.accuracy).toBeCloseTo(0.9, 5);

    const empty = result.trend.find((point) => point.date === '2024-01-12');
    expect(empty).toEqual({
      date: '2024-01-12',
      netWpm: 0,
      accuracy: 0,
      averageLatencyMs: 0,
      sessionsCompleted: 0,
    });
  });

  it('RN34 - heatmap soma acionamentos e dias ativos por tecla na janela de 7 dias', async () => {
    const { habits, aggregateRepository } = buildUseCase();
    await aggregateRepository.save(
      aggregate('2024-01-10', { keyCounts: { a: 5, b: 1 } })
    );
    await aggregateRepository.save(
      aggregate('2024-01-11', { keyCounts: { a: 3, b: 2, c: 4 } })
    );
    // Fora da janela de 7 dias (anterior a 2024-01-09) — não deve entrar no heatmap
    await aggregateRepository.save(
      aggregate('2024-01-01', { keyCounts: { a: 100 } })
    );

    const result = await habits.execute(USER_ID.value);

    expect(result.heatmap).toEqual([
      { logicalKey: 'a', count: 8, activeDays: 2 },
      { logicalKey: 'c', count: 4, activeDays: 1 },
      { logicalKey: 'b', count: 3, activeDays: 2 },
    ]);
  });

  it('RN35/RN37 - KPIs da janela de 30 dias (isolado do restante do histórico)', async () => {
    const { habits, aggregateRepository } = buildUseCase();
    await aggregateRepository.save(
      aggregate('2024-01-10', {
        sessionsCompleted: 2,
        totalActiveMs: 60000,
        totalGrossChars: 100,
        totalCorrectChars: 90,
        totalLatencyMs: 2000,
        totalLatencySamples: 100,
        keysPracticed: ['a', 'b'],
      })
    );
    // Fora da janela de 30 dias
    await aggregateRepository.save(
      aggregate('2023-12-01', {
        sessionsCompleted: 10,
        totalActiveMs: 300000,
        totalGrossChars: 500,
        totalCorrectChars: 400,
        totalLatencyMs: 10000,
        totalLatencySamples: 500,
        keysPracticed: ['z'],
      })
    );

    const result = await habits.execute(USER_ID.value);

    expect(result.kpis).toMatchObject({
      netWpm: 18,
      averageLatencyMs: 20,
      sessionsCompleted: 2,
      daysActive: 1,
      keysPracticed: 2,
    });
    expect(result.kpis.accuracy).toBeCloseTo(0.9, 5);
  });

  it('RN17 - isolamento por usuário: outra conta não vaza para o dashboard', async () => {
    const { habits, aggregateRepository } = buildUseCase();
    const other = SessionId.create('550e8400-e29b-41d4-a716-446655440051');
    await aggregateRepository.save(
      DailyMetricsAggregate.create({
        userId: other,
        layout: ABNT2,
        date: '2024-01-10',
        keyCounts: { a: 99 },
      })
    );

    const result = await habits.execute(USER_ID.value);

    expect(result.trend).toHaveLength(90);
    expect(result.trend.every((point) => point.sessionsCompleted === 0)).toBe(true);
    expect(result.heatmap).toHaveLength(0);
    expect(result.kpis.sessionsCompleted).toBe(0);
  });
});
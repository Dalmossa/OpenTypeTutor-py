import { describe, expect, it } from 'vitest';
import { DailyMetricsAggregate } from './DailyMetricsAggregate.js';
import { SessionMetrics } from './SessionMetrics.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';

const USER_ID = SessionId.create();
const ABNT2 = Layout.create('ABNT2');

function sessionMetrics(minutes = 1): SessionMetrics {
  return SessionMetrics.create({
    charactersTyped: 100,
    correctCharacters: 95,
    incorrectCharacters: 5,
    correctedErrors: 0,
    finalUncorrectedErrors: 5,
    accuracy: 0.95,
    grossWpm: 40,
    netWpm: 38,
    activeDurationMs: minutes * 60000,
    averageLatencyMs: 400,
  });
}

describe('RN35 - DailyMetricsAggregate', () => {
  it('RN35 - merge acumula contadores somáveis por (userId, layout, date)', () => {
    const day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: ABNT2,
      date: '2026-01-01',
    });

    const merged = day.merge(sessionMetrics(), ['a', 'b']).merge(sessionMetrics(), ['b', 'c']);

    expect(merged.sessionsCompleted).toBe(2);
    expect(merged.totalActiveMs).toBe(120000);
    expect(merged.totalGrossChars).toBe(200);
    expect(merged.totalCorrectChars).toBe(190);
    expect(merged.totalErrors).toBe(10);
    expect(merged.totalLatencyMs).toBe(80000);
    expect(merged.totalLatencySamples).toBe(200);
    expect(merged.keysPracticed.sort()).toEqual(['a', 'b', 'c']);
  });

  it('RN34 - merge acumula contagem de acionamentos por tecla (mapa de calor)', () => {
    const day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: ABNT2,
      date: '2026-01-01',
    });

    const merged = day.merge(sessionMetrics(), ['a', 'a', 'b']).merge(sessionMetrics(), ['a', 'c']);

    expect(merged.keyCountsByKey).toEqual({ a: 3, b: 1, c: 1 });
  });

  it('RN35 - derivações do dia: netWpm, precisão e latência média', () => {
    const day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: ABNT2,
      date: '2026-01-01',
    });
    const merged = day.merge(sessionMetrics(), ['a']);

    expect(merged.netWpm()).toBeCloseTo(19, 10); // (95/5) palavras / 1 min
    expect(merged.accuracy()).toBeCloseTo(0.95, 10);
    expect(merged.averageLatencyMs()).toBeCloseTo(400, 10);
  });

  it('RN35 - derivações com zero prática não dividem por zero', () => {
    const day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: ABNT2,
      date: '2026-01-01',
    });
    expect(day.netWpm()).toBe(0);
    expect(day.accuracy()).toBe(0);
    expect(day.averageLatencyMs()).toBe(0);
  });

  it('RN37 - date usa formato de dia calendário local YYYY-MM-DD', () => {
    const invalid = () =>
      DailyMetricsAggregate.create({ userId: USER_ID, layout: ABNT2, date: '01/01/2026' });
    expect(invalid).toThrow();
    expect(() =>
      DailyMetricsAggregate.create({ userId: USER_ID, layout: ABNT2, date: '2026-01-01' })
    ).not.toThrow();
  });

  it('RN11 - agregação é isolada por layout (mesmo dia pode divergir por layout)', () => {
    const usIntl = Layout.create('US-INTERNATIONAL');
    const abnt2Day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: ABNT2,
      date: '2026-01-01',
    }).merge(sessionMetrics(), ['a', 'b', 'c']);
    const usIntlDay = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout: usIntl,
      date: '2026-01-01',
    });

    expect(abnt2Day.keysPracticed).toContain('c');
    expect(usIntlDay.keysPracticed).not.toContain('c');
    expect(abnt2Day.sessionsCompleted).toBe(1);
    expect(usIntlDay.sessionsCompleted).toBe(0);
  });

  it('RN17 - userId é obrigatório e validado', () => {
    expect(() =>
      DailyMetricsAggregate.create({
        userId: 'invalid' as unknown as SessionId,
        layout: ABNT2,
        date: '2026-01-01',
      })
    ).toThrow();
  });
});
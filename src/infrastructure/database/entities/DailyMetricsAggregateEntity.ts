import { EntitySchema } from 'typeorm';

export interface DailyMetricsAggregateRow {
  userId: string;
  layout: string;
  date: string; // YYYY-MM-DD local do usuário (RN37)
  sessionsCompleted: number;
  totalActiveMs: number;
  totalGrossChars: number;
  totalCorrectChars: number;
  totalErrors: number;
  totalLatencyMs: number;
  totalLatencySamples: number;
  keysPracticed: string; // JSON array
}

// RN35 - agregado diário pré-computado (RN14: upsert idempotente no submit). RN17: userId na PK.
export const DailyMetricsAggregateEntity = new EntitySchema<DailyMetricsAggregateRow>({
  name: 'DailyMetricsAggregateEntity',
  tableName: 'daily_metrics_aggregate',
  columns: {
    userId: { type: 'text', primary: true },
    layout: { type: 'text', primary: true },
    date: { type: 'text', primary: true },
    sessionsCompleted: { type: 'int', nullable: false, default: 0 },
    totalActiveMs: { type: 'int', nullable: false, default: 0 },
    totalGrossChars: { type: 'int', nullable: false, default: 0 },
    totalCorrectChars: { type: 'int', nullable: false, default: 0 },
    totalErrors: { type: 'int', nullable: false, default: 0 },
    totalLatencyMs: { type: 'int', nullable: false, default: 0 },
    totalLatencySamples: { type: 'int', nullable: false, default: 0 },
    keysPracticed: { type: 'text', nullable: false, default: '[]' },
  },
});
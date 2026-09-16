import { EntitySchema } from 'typeorm';

export interface KeyPerformanceRow {
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
  masteryState: string;
}

export const KeyPerformanceEntity = new EntitySchema<KeyPerformanceRow>({
  name: 'KeyPerformanceEntity',
  tableName: 'key_performances',
  columns: {
    id: { type: 'text', primary: true },
    userId: { type: 'text', nullable: false },
    logicalKey: { type: 'text', nullable: false },
    layout: { type: 'text', nullable: false },
    attempts: { type: 'int', nullable: false },
    errors: { type: 'int', nullable: false },
    averageLatencyMs: { type: 'int', nullable: false },
    lastPracticedAt: { type: 'text', nullable: true },
    consecutiveMasterySessions: { type: 'int', nullable: false },
    regressionSessions: { type: 'int', nullable: false },
    masteryState: { type: 'text', nullable: false },
  },
  uniques: [{ name: 'UQ_key_performances_user_logicalKey_layout', columns: ['userId', 'logicalKey', 'layout'] }],
});
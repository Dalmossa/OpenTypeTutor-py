import { EntitySchema } from 'typeorm';

export interface TypingSessionRow {
  id: string;
  userId: string;
  lessonId: string;
  layout: string;
  state: string;
  startedAt: string | null;
  completedAt: string | null;
  activeDurationMs: number;
  metrics: string | null;
  keystrokes: string;
  pausedAt: string | null;
  totalPausedDurationMs: number;
}

export const TypingSessionEntity = new EntitySchema<TypingSessionRow>({
  name: 'TypingSessionEntity',
  tableName: 'typing_sessions',
  columns: {
    id: { type: 'text', primary: true },
    userId: { type: 'text', nullable: false },
    lessonId: { type: 'text', nullable: false },
    layout: { type: 'text', nullable: false },
    state: { type: 'text', nullable: false },
    startedAt: { type: 'text', nullable: true },
    completedAt: { type: 'text', nullable: true },
    activeDurationMs: { type: 'int', nullable: false },
    metrics: { type: 'text', nullable: true },
    keystrokes: { type: 'text', nullable: false },
    pausedAt: { type: 'text', nullable: true },
    totalPausedDurationMs: { type: 'int', nullable: false },
  },
  indices: [{ name: 'IDX_typing_sessions_userId', columns: ['userId'] }],
});
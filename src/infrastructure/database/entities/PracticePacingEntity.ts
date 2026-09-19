import { EntitySchema } from 'typeorm';

export interface PracticePacingRow {
  userId: string;
  accumulatedActiveMs: number;
  lastSessionEndedAt: string | null;
}

// RN33 - estado de pacing de prática persistido por usuário (chave primária = userId, RN17)
export const PracticePacingEntity = new EntitySchema<PracticePacingRow>({
  name: 'PracticePacingEntity',
  tableName: 'practice_pacing',
  columns: {
    userId: { type: 'text', primary: true },
    accumulatedActiveMs: { type: 'int', nullable: false },
    lastSessionEndedAt: { type: 'text', nullable: true },
  },
});
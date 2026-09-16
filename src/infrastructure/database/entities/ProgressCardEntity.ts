import { EntitySchema } from 'typeorm';

export interface ProgressCardRow {
  id: string;
  userId: string;
  date: string;
  phase: string;
  lessonNumber: number;
  insecureKeys: string;
  discomfortReported: boolean;
  discomfortDetail: string | null;
  nextSessionNote: string;
  previousBackspaceCount: number;
  currentBackspaceCount: number;
}

export const ProgressCardEntity = new EntitySchema<ProgressCardRow>({
  name: 'ProgressCardEntity',
  tableName: 'progress_cards',
  columns: {
    id: { type: 'text', primary: true },
    userId: { type: 'text', nullable: false },
    date: { type: 'text', nullable: false },
    phase: { type: 'text', nullable: false },
    lessonNumber: { type: 'int', nullable: false },
    insecureKeys: { type: 'text', nullable: false },
    discomfortReported: { type: 'boolean', nullable: false },
    discomfortDetail: { type: 'text', nullable: true },
    nextSessionNote: { type: 'text', nullable: false },
    previousBackspaceCount: { type: 'int', nullable: false },
    currentBackspaceCount: { type: 'int', nullable: false },
  },
  indices: [{ name: 'IDX_progress_cards_userId', columns: ['userId'] }],
});
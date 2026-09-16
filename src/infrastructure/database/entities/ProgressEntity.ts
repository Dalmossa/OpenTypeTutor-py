import { EntitySchema } from 'typeorm';

export interface ProgressRow {
  id: string;
  userId: string;
  currentLessonId: string;
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: string | null;
}

export const ProgressEntity = new EntitySchema<ProgressRow>({
  name: 'ProgressEntity',
  tableName: 'progress',
  columns: {
    id: { type: 'text', primary: true },
    userId: { type: 'text', nullable: false, unique: true },
    currentLessonId: { type: 'text', nullable: false },
    currentLevel: { type: 'int', nullable: false },
    completedLessons: { type: 'int', nullable: false },
    lastCompletedAt: { type: 'text', nullable: true },
  },
});
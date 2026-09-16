import { EntitySchema } from 'typeorm';

export interface LessonRow {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string;
  difficulty: string;
  type: string;
  layout: string;
  pedagogicalPhase: string | null;
  lessonInPhase: number | null;
}

export const LessonEntity = new EntitySchema<LessonRow>({
  name: 'LessonEntity',
  tableName: 'lessons',
  columns: {
    id: { type: 'text', primary: true },
    level: { type: 'int', nullable: false },
    title: { type: 'text', nullable: false },
    content: { type: 'text', nullable: false },
    targetKeys: { type: 'text', nullable: false },
    difficulty: { type: 'text', nullable: false },
    type: { type: 'text', nullable: false },
    layout: { type: 'text', nullable: false },
    pedagogicalPhase: { type: 'text', nullable: true },
    lessonInPhase: { type: 'int', nullable: true },
  },
});
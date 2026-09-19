import { EntitySchema } from 'typeorm';

export type MasteryTransitionLogicalState =
  | 'UNKNOWN'
  | 'LEARNING'
  | 'CONSOLIDATING'
  | 'MASTERED'
  | 'WEAK';

export interface KeyMasteryTransitionRow {
  id?: number;
  userId: string;
  logicalKey: string;
  layout: string;
  date: string;
  from: MasteryTransitionLogicalState;
  to: MasteryTransitionLogicalState;
}

// Timeline de mudanças de masteryState por tecla (RN09/RN10). RN17: userId indexado.
export const KeyMasteryTransitionEntity = new EntitySchema<KeyMasteryTransitionRow>({
  name: 'KeyMasteryTransitionEntity',
  tableName: 'key_mastery_transition',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: 'increment',
    },
    userId: { type: 'text', nullable: false },
    logicalKey: { type: 'text', nullable: false },
    layout: { type: 'text', nullable: false },
    date: { type: 'text', nullable: false },
    from: { type: 'text', nullable: false },
    to: { type: 'text', nullable: false },
  },
  indices: [{ name: 'IDX_kmx_user_date', columns: ['userId', 'date'] }],
});
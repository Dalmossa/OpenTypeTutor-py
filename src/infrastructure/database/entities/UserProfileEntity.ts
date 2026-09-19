import { EntitySchema } from 'typeorm';

export interface UserProfileRow {
  userId: string;
  activeLayout: string;
  currentLevel: number;
  timezone: string; // IANA (RN37)
}

export const UserProfileEntity = new EntitySchema<UserProfileRow>({
  name: 'UserProfileEntity',
  tableName: 'user_profiles',
  columns: {
    userId: { type: 'text', primary: true },
    activeLayout: { type: 'text', nullable: false },
    currentLevel: { type: 'int', nullable: false },
    timezone: { type: 'text', nullable: false, default: 'America/Sao_Paulo' },
  },
});
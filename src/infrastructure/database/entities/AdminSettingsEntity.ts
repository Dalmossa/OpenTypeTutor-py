import { EntitySchema } from "typeorm";

export interface AdminSettingsRow {
  id: number;
  macroBreakEnabled: number; // SQLite usa 0/1 para boolean
  macroLessonsThreshold: number;
  macroBreakDurationMs: number;
  microBlockDurationMs: number;
  microBreakDurationMs: number;
  updatedAt: string;
}

// Tabela singleton para configurações administrativas (apenas 1 linha)
export const AdminSettingsEntity = new EntitySchema<AdminSettingsRow>({
  name: "AdminSettingsEntity",
  tableName: "admin_settings",
  columns: {
    id: { type: "integer", primary: true, generated: true },
    macroBreakEnabled: { type: "int", nullable: false, default: 1 },
    macroLessonsThreshold: { type: "int", nullable: false, default: 3 },
    macroBreakDurationMs: { type: "int", nullable: false, default: 10800000 },
    microBlockDurationMs: { type: "int", nullable: false, default: 900000 },
    microBreakDurationMs: { type: "int", nullable: false, default: 180000 },
    updatedAt: { type: "text", nullable: false },
  },
});

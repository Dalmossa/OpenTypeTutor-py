// RN34 - configurações administrativas expostas à API
export interface AdminSettingsDTO {
  macroBreakEnabled: boolean;
  macroLessonsThreshold: number;
  macroBreakDurationMs: number;
  microBlockDurationMs: number;
  microBreakDurationMs: number;
}

export type GetAdminSettingsResponseDTO = AdminSettingsDTO;

export interface UpdateAdminSettingsRequestDTO {
  macroBreakEnabled?: boolean | undefined;
  macroLessonsThreshold?: number | undefined;
  macroBreakDurationMs?: number | undefined;
  microBlockDurationMs?: number | undefined;
  microBreakDurationMs?: number | undefined;
}

export type UpdateAdminSettingsResponseDTO = AdminSettingsDTO;

import type { AdminSettings } from "../entities/AdminSettings.js";

// Repositório para configurações administrativas (singleton por instalação)
export interface IAdminSettingsRepository {
  find(): Promise<AdminSettings | null>;
  save(settings: AdminSettings): Promise<void>;
}

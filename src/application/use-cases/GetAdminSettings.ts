import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import type { GetAdminSettingsResponseDTO } from "../dtos/AdminSettingsDTOs.js";

export class GetAdminSettings {
  constructor(private readonly settingsRepository: IAdminSettingsRepository) {}

  async execute(): Promise<GetAdminSettingsResponseDTO> {
    const settings = await this.settingsRepository.find();
    // Retorna defaults se não houver configuração salva
    return (
      settings?.toDTO() ?? {
        macroBreakEnabled: true,
        macroLessonsThreshold: 3,
        macroBreakDurationMs: 10800000,
        microBlockDurationMs: 900000,
        microBreakDurationMs: 180000,
      }
    );
  }
}

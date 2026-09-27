import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import { AdminSettings } from "../../domain/entities/AdminSettings.js";
import type {
  UpdateAdminSettingsRequestDTO,
  UpdateAdminSettingsResponseDTO,
} from "../dtos/AdminSettingsDTOs.js";

export class UpdateAdminSettings {
  constructor(private readonly settingsRepository: IAdminSettingsRepository) {}

  async execute(
    dto: UpdateAdminSettingsRequestDTO,
  ): Promise<UpdateAdminSettingsResponseDTO> {
    let settings = await this.settingsRepository.find();
    if (!settings) {
      settings = AdminSettings.create({});
    }
    const updated = settings.update(dto);
    await this.settingsRepository.save(updated);
    return updated.toDTO();
  }
}

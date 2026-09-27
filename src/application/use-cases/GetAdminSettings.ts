import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import { AdminSettings } from "../../domain/entities/AdminSettings.js";
import type { GetAdminSettingsResponseDTO } from "../dtos/AdminSettingsDTOs.js";

export class GetAdminSettings {
  constructor(private readonly settingsRepository: IAdminSettingsRepository) {}

  async execute(): Promise<GetAdminSettingsResponseDTO> {
    const settings = await this.settingsRepository.find();
    // Sem linha persistida, o fallback é a *fábrica* da entidade e não um
    // objeto de literais: `AdminSettings.create()` já lê `adaptiveParams`, então
    // a fonte única é uma. A versão anterior repetia os 5 valores aqui, o que
    // fazia o threshold retornado divergir do motor quando o parâmetro mudava
    // (e ainda carregava `no-magic-numbers` por 5 números de produto).
    return settings?.toDTO() ?? AdminSettings.create().toDTO();
  }
}

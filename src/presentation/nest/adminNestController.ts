import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from "@nestjs/common";
import type { AdminSettingsDTO } from "../../application/dtos/AdminSettingsDTOs.js";
import type {
  GetAdminSettingsPort,
  UpdateAdminSettingsPort,
} from "../ports/useCasePorts.js";
import { updateAdminSettingsSchema } from "../validators/adminValidators.js";
import { parseSchema } from "../validation/zodErrorMap.js";
import { AdminGuard } from "./admin.guard.js";
import { AuthGuard } from "./auth.guard.js";
import { TOKENS } from "./nestTokens.js";

/**
 * RN34 - configurações de macro-pausa. Espelha o mount `/admin` do lado Express
 * (`app.ts`), que também carrega os dois guards.
 */
@Controller("/admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminNestController {
  constructor(
    @Inject(TOKENS.GET_ADMIN_SETTINGS)
    private readonly getAdminSettings: GetAdminSettingsPort,
    @Inject(TOKENS.UPDATE_ADMIN_SETTINGS)
    private readonly updateAdminSettings: UpdateAdminSettingsPort,
  ) {}

  @Get("settings")
  async settings(): Promise<AdminSettingsDTO> {
    return this.getAdminSettings.execute();
  }

  @Patch("settings")
  async updateSettings(@Body() body: unknown): Promise<AdminSettingsDTO> {
    const parsed = parseSchema(updateAdminSettingsSchema, body);
    return this.updateAdminSettings.execute(parsed);
  }
}

import type { DataSource, Repository } from "typeorm";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import type { AdminSettings } from "../../domain/entities/AdminSettings.js";
import { AdminSettings as AdminSettingsValue } from "../../domain/entities/AdminSettings.js";
import {
  AdminSettingsEntity,
  type AdminSettingsRow,
} from "../database/entities/index.js";

function toRow(settings: AdminSettings): AdminSettingsRow {
  return {
    id: 1, // singleton
    macroBreakEnabled: settings.macroBreakEnabled ? 1 : 0,
    macroLessonsThreshold: settings.macroLessonsThreshold,
    macroBreakDurationMs: settings.macroBreakDurationMs,
    microBlockDurationMs: settings.microBlockDurationMs,
    microBreakDurationMs: settings.microBreakDurationMs,
    updatedAt: new Date().toISOString(),
  };
}

function fromRow(row: AdminSettingsRow): AdminSettings {
  return AdminSettingsValue.fromDTO({
    macroBreakEnabled: row.macroBreakEnabled === 1,
    macroLessonsThreshold: row.macroLessonsThreshold,
    macroBreakDurationMs: row.macroBreakDurationMs,
    microBlockDurationMs: row.microBlockDurationMs,
    microBreakDurationMs: row.microBreakDurationMs,
  });
}

export class TypeOrmAdminSettingsRepository implements IAdminSettingsRepository {
  private readonly repo: Repository<AdminSettingsRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(AdminSettingsEntity);
  }

  async find(): Promise<AdminSettings | null> {
    const row = await this.repo.findOne({ where: { id: 1 } });
    return row === null ? null : fromRow(row);
  }

  async save(settings: AdminSettings): Promise<void> {
    await this.repo.save(toRow(settings));
  }
}

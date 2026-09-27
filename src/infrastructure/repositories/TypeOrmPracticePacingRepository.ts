import type { DataSource, Repository } from "typeorm";
import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import type { PracticePacingState } from "../../domain/entities/PracticePacingState.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";
import { SessionId as SessionIdValue } from "../../domain/value-objects/SessionId.js";
import { PracticePacingState as PracticePacingStateValue } from "../../domain/entities/PracticePacingState.js";
import {
  PracticePacingEntity,
  type PracticePacingRow,
} from "../database/entities/index.js";

function toRow(pacing: PracticePacingState): PracticePacingRow {
  return {
    userId: pacing.userId.value,
    accumulatedActiveMs: pacing.accumulatedActiveMs,
    lastSessionEndedAt: pacing.lastSessionEndedAt?.toISOString() ?? null,
    completedLessonsSinceMacroBreak: pacing.completedLessonsSinceMacroBreak,
    macroBreakEndsAt: pacing.macroBreakEndsAt?.toISOString() ?? null,
  };
}

function fromRow(row: PracticePacingRow): PracticePacingState {
  return PracticePacingStateValue.create({
    userId: SessionIdValue.create(row.userId),
    accumulatedActiveMs: row.accumulatedActiveMs,
    ...(row.lastSessionEndedAt !== null
      ? { lastSessionEndedAt: new Date(row.lastSessionEndedAt) }
      : {}),
    completedLessonsSinceMacroBreak: row.completedLessonsSinceMacroBreak,
    ...(row.macroBreakEndsAt !== null
      ? { macroBreakEndsAt: new Date(row.macroBreakEndsAt) }
      : {}),
  });
}

export class TypeOrmPracticePacingRepository implements IPracticePacingRepository {
  private readonly repo: Repository<PracticePacingRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PracticePacingEntity);
  }

  async findByUserId(userId: SessionId): Promise<PracticePacingState | null> {
    const row = await this.repo.findOne({ where: { userId: userId.value } });
    return row === null ? null : fromRow(row);
  }

  async save(pacing: PracticePacingState): Promise<void> {
    await this.repo.save(toRow(pacing));
  }
}

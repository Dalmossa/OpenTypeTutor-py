import type { DataSource, Repository } from "typeorm";
import type { IDailyMetricsAggregateRepository } from "../../domain/repositories/IDailyMetricsAggregateRepository.js";
import type { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";
import type { Layout } from "../../domain/value-objects/Layout.js";
import { SessionId as SessionIdValue } from "../../domain/value-objects/SessionId.js";
import { Layout as LayoutValue } from "../../domain/value-objects/Layout.js";
import { DailyMetricsAggregate as DailyMetricsAggregateValue } from "../../domain/entities/DailyMetricsAggregate.js";
import {
  DailyMetricsAggregateEntity,
  type DailyMetricsAggregateRow,
} from "../database/entities/index.js";

function toRow(aggregate: DailyMetricsAggregate): DailyMetricsAggregateRow {
  return {
    userId: aggregate.userId.value,
    layout: aggregate.layout.value,
    date: aggregate.date,
    sessionsCompleted: aggregate.sessionsCompleted,
    totalActiveMs: aggregate.totalActiveMs,
    totalGrossChars: aggregate.totalGrossChars,
    totalCorrectChars: aggregate.totalCorrectChars,
    totalErrors: aggregate.totalErrors,
    totalLatencyMs: aggregate.totalLatencyMs,
    totalLatencySamples: aggregate.totalLatencySamples,
    keysPracticed: JSON.stringify(aggregate.keysPracticed),
    keyCounts: JSON.stringify(aggregate.keyCountsByKey),
  };
}

function fromRow(row: DailyMetricsAggregateRow): DailyMetricsAggregate {
  return DailyMetricsAggregateValue.create({
    userId: SessionIdValue.create(row.userId),
    layout: LayoutValue.create(row.layout),
    date: row.date,
    sessionsCompleted: row.sessionsCompleted,
    totalActiveMs: row.totalActiveMs,
    totalGrossChars: row.totalGrossChars,
    totalCorrectChars: row.totalCorrectChars,
    totalErrors: row.totalErrors,
    totalLatencyMs: row.totalLatencyMs,
    totalLatencySamples: row.totalLatencySamples,
    keysPracticed: JSON.parse(row.keysPracticed) as string[],
    keyCounts: JSON.parse(row.keyCounts) as Record<string, number>,
  });
}

export class TypeOrmDailyMetricsAggregateRepository implements IDailyMetricsAggregateRepository {
  private readonly repo: Repository<DailyMetricsAggregateRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(DailyMetricsAggregateEntity);
  }

  async findByKey(
    userId: SessionId,
    layout: Layout,
    date: string,
  ): Promise<DailyMetricsAggregate | null> {
    const row = await this.repo.findOne({
      where: { userId: userId.value, layout: layout.value, date },
    });
    return row === null ? null : fromRow(row);
  }

  async save(aggregate: DailyMetricsAggregate): Promise<void> {
    await this.repo.save(toRow(aggregate));
  }

  async findByUserBetween(
    userId: SessionId,
    layout: Layout,
    fromDate: string,
    toDate: string,
  ): Promise<DailyMetricsAggregate[]> {
    const rows = await this.repo.find({
      where: { userId: userId.value, layout: layout.value },
    });
    return rows
      .filter((r) => r.date >= fromDate && r.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(fromRow);
  }

  // RN31 - reset de progresso apaga os agregados diários do usuário (RN17)
  async deleteByUserId(userId: SessionId): Promise<void> {
    await this.repo.delete({ userId: userId.value });
  }
}

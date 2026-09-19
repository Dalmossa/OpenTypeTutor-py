import type { IDailyMetricsAggregateRepository } from "../../domain/repositories/IDailyMetricsAggregateRepository.js";
import type { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";
import type { Layout } from "../../domain/value-objects/Layout.js";

// RN35 - agregado diário em memória; chave composta (userId, layout, date local RN37)
export class InMemoryDailyMetricsAggregateRepository implements IDailyMetricsAggregateRepository {
  private byKey = new Map<string, DailyMetricsAggregate>();

  static key(userId: SessionId, layout: Layout, date: string): string {
    return `${userId.value}|${layout.value}|${date}`;
  }

  async findByKey(
    userId: SessionId,
    layout: Layout,
    date: string,
  ): Promise<DailyMetricsAggregate | null> {
    await Promise.resolve();
    return (
      this.byKey.get(
        InMemoryDailyMetricsAggregateRepository.key(userId, layout, date),
      ) ?? null
    );
  }

  async save(aggregate: DailyMetricsAggregate): Promise<void> {
    await Promise.resolve();
    this.byKey.set(
      InMemoryDailyMetricsAggregateRepository.key(
        aggregate.userId,
        aggregate.layout,
        aggregate.date,
      ),
      aggregate,
    );
  }

  async findByUserBetween(
    userId: SessionId,
    layout: Layout,
    fromDate: string,
    toDate: string,
  ): Promise<DailyMetricsAggregate[]> {
    await Promise.resolve();
    return Array.from(this.byKey.values())
      .filter(
        (agg) =>
          agg.userId.equals(userId) &&
          agg.layout.equals(layout) &&
          agg.date >= fromDate &&
          agg.date <= toDate,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async deleteByUserId(userId: SessionId): Promise<void> {
    await Promise.resolve();
    const prefix = `${userId.value}|`;
    for (const key of this.byKey.keys()) {
      if (key.startsWith(prefix)) {
        this.byKey.delete(key);
      }
    }
  }

  clear(): void {
    this.byKey.clear();
  }
}

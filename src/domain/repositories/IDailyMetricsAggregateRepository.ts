import type { SessionId } from "../value-objects/SessionId.js";
import type { Layout } from "../value-objects/Layout.js";
import type { DailyMetricsAggregate } from "../entities/DailyMetricsAggregate.js";

// RN35 - agregado diário pré-computado por (userId, layout, date local RN37). RN17: isolamento por userId.
export interface IDailyMetricsAggregateRepository {
  findByKey(
    userId: SessionId,
    layout: Layout,
    date: string,
  ): Promise<DailyMetricsAggregate | null>;
  save(aggregate: DailyMetricsAggregate): Promise<void>;
  findByUserBetween(
    userId: SessionId,
    layout: Layout,
    fromDate: string,
    toDate: string,
  ): Promise<DailyMetricsAggregate[]>;
  // RN31 - reset de progresso apaga os agregados diários do usuário (isolado por userId RN17)
  deleteByUserId(userId: SessionId): Promise<void>;
}

import type { IUserProfileRepository } from "../../domain/repositories/IUserProfileRepository.js";
import type { IDailyMetricsAggregateRepository } from "../../domain/repositories/IDailyMetricsAggregateRepository.js";
import type { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";
import { Timezone } from "../../domain/value-objects/Timezone.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";
import {
  CHARS_PER_WORD,
  MS_PER_MINUTE,
} from "../../domain/config/timeUnits.js";
import type {
  DashboardHeatmapKey,
  DashboardKPI,
  DashboardTrendPoint,
  GetDashboardHabitsResponseDTO,
} from "../dtos/DashboardDTOs.js";
import { shiftLocalDate } from "./dashboardWindows.js";

// Default fallback para trend window quando adaptiveParams não define (dias)
const DEFAULT_TREND_DAYS = 90;

type Clock = () => Date;

const KPI_WINDOW_DAYS = 30;

// RN34/RN35/RN37 - painel de hábitos do dashboard: KPIs (janela 30d), série diária (janela 90d)
// e mapa de calor por tecla (janela 7d). Só lê agregados pré-computados (RNF11, ADR-020).
export class GetDashboardHabits {
  constructor(
    private readonly profileRepository: IUserProfileRepository,
    private readonly aggregateRepository: IDailyMetricsAggregateRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(userId: string): Promise<GetDashboardHabitsResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const profile = await this.profileRepository.findByUserId(targetUserId);
    const layout = profile?.activeLayout ?? Layout.create("ABNT2");
    const timezone =
      profile !== null
        ? Timezone.create({ value: profile.timezone })
        : Timezone.createDefault();

    const localToday = timezone.toLocalDateKey(this.now());
    const trendDays =
      adaptiveParams.DASHBOARD_TREND_WINDOWS_DAYS.at(-1) ?? DEFAULT_TREND_DAYS;
    const heatmapDays = adaptiveParams.DASHBOARD_HEATMAP_WINDOW_DAYS;

    const fromTrend = shiftLocalDate(localToday, -(trendDays - 1));
    const aggregates = await this.aggregateRepository.findByUserBetween(
      targetUserId,
      layout,
      fromTrend,
      localToday,
    );

    const trend = this.buildTrend(aggregates, fromTrend, localToday, trendDays);
    const kpis = this.buildKpis(
      aggregates,
      shiftLocalDate(localToday, -(KPI_WINDOW_DAYS - 1)),
    );
    const heatmap = this.buildHeatmap(
      aggregates,
      shiftLocalDate(localToday, -(heatmapDays - 1)),
    );

    return { kpis, trend, heatmap };
  }

  private buildTrend(
    aggregates: DailyMetricsAggregate[],
    fromDate: string,
    toDate: string,
    days: number,
  ): DashboardTrendPoint[] {
    const byDate = new Map<string, DailyMetricsAggregate>();
    for (const aggregate of aggregates) {
      byDate.set(aggregate.date, aggregate);
    }

    const points: DashboardTrendPoint[] = [];
    let cursor = fromDate;
    for (let i = 0; i < days && cursor <= toDate; i += 1) {
      const aggregate = byDate.get(cursor);
      points.push({
        date: cursor,
        netWpm:
          aggregate !== undefined
            ? Math.round(aggregate.netWpm() * 100) / 100
            : 0,
        accuracy: aggregate !== undefined ? aggregate.accuracy() : 0,
        averageLatencyMs:
          aggregate !== undefined
            ? Math.round(aggregate.averageLatencyMs())
            : 0,
        sessionsCompleted:
          aggregate !== undefined ? aggregate.sessionsCompleted : 0,
      });
      cursor = shiftLocalDate(cursor, 1);
    }
    return points;
  }

  private buildKpis(
    aggregates: DailyMetricsAggregate[],
    fromDate: string,
  ): DashboardKPI {
    let sessionsCompleted = 0;
    let totalActiveMs = 0;
    let totalGrossChars = 0;
    let totalCorrectChars = 0;
    let totalLatencyMs = 0;
    let totalLatencySamples = 0;
    const keys = new Set<string>();
    const activeDates = new Set<string>();

    for (const aggregate of aggregates) {
      if (aggregate.date < fromDate) continue;
      sessionsCompleted += aggregate.sessionsCompleted;
      totalActiveMs += aggregate.totalActiveMs;
      totalGrossChars += aggregate.totalGrossChars;
      totalCorrectChars += aggregate.totalCorrectChars;
      totalLatencyMs += aggregate.totalLatencyMs;
      totalLatencySamples += aggregate.totalLatencySamples;
      for (const key of aggregate.keysPracticed) keys.add(key);
      activeDates.add(aggregate.date);
    }

    const netWpm =
      totalActiveMs === 0
        ? 0
        : totalCorrectChars / CHARS_PER_WORD / (totalActiveMs / MS_PER_MINUTE);
    const accuracy =
      totalGrossChars === 0 ? 0 : totalCorrectChars / totalGrossChars;
    const averageLatencyMs =
      totalLatencySamples === 0 ? 0 : totalLatencyMs / totalLatencySamples;

    return {
      netWpm: Math.round(netWpm * 100) / 100,
      accuracy,
      averageLatencyMs: Math.round(averageLatencyMs),
      sessionsCompleted,
      daysActive: activeDates.size,
      keysPracticed: keys.size,
    };
  }

  private buildHeatmap(
    aggregates: DailyMetricsAggregate[],
    fromDate: string,
  ): DashboardHeatmapKey[] {
    const counts = new Map<
      string,
      { count: number; activeDays: Set<string> }
    >();

    for (const aggregate of aggregates) {
      if (aggregate.date < fromDate) continue;
      for (const [key, count] of Object.entries(aggregate.keyCountsByKey)) {
        const entry = counts.get(key) ?? {
          count: 0,
          activeDays: new Set<string>(),
        };
        entry.count += count;
        entry.activeDays.add(aggregate.date);
        counts.set(key, entry);
      }
    }

    return Array.from(counts.entries())
      .map(([logicalKey, { count, activeDays }]) => ({
        logicalKey,
        count,
        activeDays: activeDays.size,
      }))
      .sort(
        (a, b) => b.count - a.count || a.logicalKey.localeCompare(b.logicalKey),
      );
  }
}

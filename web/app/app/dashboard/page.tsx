"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { HeatmapKeyboard } from "@/components/dashboard/heatmap-keyboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ProximityList } from "@/components/dashboard/proximity-list";
import { StateDistribution } from "@/components/dashboard/state-distribution";
import { StreakCards } from "@/components/dashboard/streak-cards";
import { formatDateKey } from "@/components/dashboard/dashboard-meta";
import { TransitionsTimeline } from "@/components/dashboard/transitions-timeline";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { enrichKPIsWithComparison } from "@/components/dashboard/dashboard-meta";
import { createControllers } from "@/controllers";
import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
  DashboardTrendPoint,
  PresetWindow,
  CustomDateRange,
  DateRangeSelection,
} from "@/models/dashboard";

// RN35 - janela selecionável na página. O backend devolve série de 90 dias;
// o recorte + comparação é só apresentação (ADR-018, sem RN).
function sliceWindow(
  trend: DashboardTrendPoint[],
  window: PresetWindow | CustomDateRange,
): DashboardTrendPoint[] {
  if (typeof window === "number") {
    return trend.length > window ? trend.slice(-window) : trend;
  }
  // CustomDateRange: filtra por intervalo
  const { start, end } = window;
  return trend.filter((p) => p.date >= start && p.date <= end);
}

function sliceComparisonWindow(
  trend: DashboardTrendPoint[],
  window: PresetWindow | CustomDateRange,
): DashboardTrendPoint[] {
  if (typeof window === "number") {
    const startIdx = Math.max(0, trend.length - window * 2);
    const endIdx = trend.length - window;
    return trend.slice(startIdx, endIdx);
  }
  // CustomDateRange: período anterior de mesmo tamanho
  const { start, end } = window;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffDays =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - diffDays);
  const prevEnd = new Date(endDate);
  prevEnd.setDate(prevEnd.getDate() - diffDays);
  const prevStartStr = prevStart.toISOString().split("T")[0];
  const prevEndStr = prevEnd.toISOString().split("T")[0];
  return trend.filter((p) => p.date >= prevStartStr && p.date <= prevEndStr);
}

// Calcula streak atual e recorde a partir do trend (dias com sessões > 0)
function computeStreaks(trend: DashboardTrendPoint[]): {
  current: number;
  longest: number;
} {
  if (trend.length === 0) return { current: 0, longest: 0 };

  const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date));
  const activeDays = new Set(
    sorted.filter((p) => p.sessionsCompleted > 0).map((p) => p.date),
  );

  let longest = 0;
  let streak = 0;

  // Itera em ordem cronológica
  for (const day of sorted) {
    const isActive = activeDays.has(day.date);
    if (isActive) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  }

  // Streak atual: conta dias ativos consecutivos a partir do fim
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (activeDays.has(sorted[i].date)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { current: currentStreak, longest };
}

export default function DashboardPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [habits, setHabits] = useState<GetDashboardHabitsResponseDTO | null>(
    null,
  );
  const [mastery, setMastery] = useState<GetDashboardMasteryResponseDTO | null>(
    null,
  );
  const [proximity, setProximity] =
    useState<GetDashboardProximityResponseDTO | null>(null);
  const [range, setRange] = useState<DateRangeSelection>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (): Promise<void> => {
    if (token === null) return;
    const controllers = createControllers();
    const [habitsResult, masteryResult, proximityResult] = await Promise.all([
      controllers.dashboard.getHabits(token),
      controllers.dashboard.getMastery(token),
      controllers.dashboard.getProximity(token),
    ]);
    setHabits(habitsResult);
    setMastery(masteryResult);
    setProximity(proximityResult);
    setErrorMessage(null);
  }, [token]);

  useEffect(() => {
    if (loading || token === null) return;
    let cancelled = false;
    fetchDashboard().catch((err: unknown) => {
      if (!cancelled) {
        setErrorMessage(
          err instanceof Error ? err.message : "Falha ao carregar o dashboard",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, token, fetchDashboard]);

  if (loading) return <p className="py-8 text-ink-subtle">Carregando…</p>;
  if (user === null)
    return <p className="py-8 text-ink-subtle">Você não está autenticado.</p>;

  // Dados para a janela atual
  const currentTrend = habits !== null ? sliceWindow(habits.trend, range) : [];
  // Dados para período anterior (comparação)
  const comparisonTrend =
    habits !== null ? sliceComparisonWindow(habits.trend, range) : [];

  // Enriquece KPIs com comparação (janela em dias)
  const windowDays = typeof range === "number" ? range : 30;
  const enrichedKpis =
    habits !== null
      ? enrichKPIsWithComparison(habits.kpis, habits.trend, windowDays)
      : EMPTY_KPIS;

  // Streaks (cálculo direto: barato e evita hook após early return)
  const { current: currentStreak, longest: longestStreak } =
    habits === null ? { current: 0, longest: 0 } : computeStreaks(habits.trend);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-ink-subtle">
          Layout ativo · {user.activeLayout}
        </span>
      </div>

      {errorMessage !== null && (
        <p className="rounded-md bg-danger-bg px-4 py-2 text-sm text-danger-fg">
          {errorMessage}
        </p>
      )}

      {habits === null &&
      mastery === null &&
      proximity === null &&
      errorMessage === null ? (
        <p className="py-8 text-ink-subtle">Carregando…</p>
      ) : (
        <>
          <section aria-label="Indicadores (janela selecionada)">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-subtle">
                Indicadores
              </h2>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
            <KpiCards
              kpis={enrichedKpis}
              activeDays={enrichedKpis.daysActive}
            />
          </section>

          {currentStreak > 0 && (
            <section aria-label="Streaks">
              <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
                Streaks
              </h2>
              <StreakCards
                currentStreak={currentStreak}
                longestStreak={longestStreak}
              />
            </section>
          )}

          <section aria-label="Evolução">
            <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
              Evolução diária (RN35)
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TrendChart
                title="PPM (palavras por minuto)"
                points={currentTrend}
                comparisonPoints={comparisonTrend}
                metric="netWpm"
                color="#6366f1"
              />
              <TrendChart
                title="Precisão"
                points={currentTrend}
                comparisonPoints={comparisonTrend}
                metric="accuracy"
                color="#10b981"
              />
              <TrendChart
                title="Latência média"
                points={currentTrend}
                comparisonPoints={comparisonTrend}
                metric="averageLatencyMs"
                color="#f59e0b"
              />
            </div>
          </section>

          <section aria-label="Mapa de calor de teclas">
            <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
              Intensidade de prática por tecla (RN34 · janela 7d)
            </h2>
            {habits !== null && habits.heatmap.length > 0 ? (
              <HeatmapKeyboard
                layout={user.activeLayout}
                heatmap={habits.heatmap}
              />
            ) : (
              <p className="rounded-lg border border-hairline bg-surface-1 p-4 text-sm text-ink-subtle">
                Ainda não há prática registrada na janela de 7 dias.
                <button
                  onClick={() => setRange(7)}
                  className="ml-2 text-primary hover:underline text-sm"
                >
                  Ver 7 dias
                </button>
              </p>
            )}
          </section>

          <section aria-label="Proximidade à maestria">
            <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
              Proximidade à maestria (RN36)
            </h2>
            <ProximityList keys={proximity?.keys ?? []} />
          </section>

          <section aria-label="Distribuição de estados">
            <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
              Distribuição de estados
            </h2>
            <StateDistribution
              counts={mastery?.countsByState ?? EMPTY_COUNTS}
            />
          </section>

          <section aria-label="Transições de maestria">
            <h2 className="mb-3 text-sm font-semibold text-ink-subtle">
              Linha do tempo de maestria (RN36)
            </h2>
            <TransitionsTimeline transitions={mastery?.transitions ?? []} />
          </section>

          {habits !== null && habits.trend.length > 0 && (
            <p className="text-xs text-ink-tertiary">
              Último dia com prática:{" "}
              {formatDateKey(habits.trend[habits.trend.length - 1].date)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const EMPTY_KPIS = {
  netWpm: 0,
  accuracy: 0,
  averageLatencyMs: 0,
  sessionsCompleted: 0,
  daysActive: 0,
  keysPracticed: 0,
};

const EMPTY_COUNTS = {
  UNKNOWN: 0,
  LEARNING: 0,
  CONSOLIDATING: 0,
  MASTERED: 0,
  WEAK: 0,
};

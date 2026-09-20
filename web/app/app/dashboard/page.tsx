'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth-provider';
import { HeatmapKeyboard } from '@/components/dashboard/heatmap-keyboard';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { ProximityList } from '@/components/dashboard/proximity-list';
import { StateDistribution } from '@/components/dashboard/state-distribution';
import { formatDateKey } from '@/components/dashboard/dashboard-meta';
import { TransitionsTimeline } from '@/components/dashboard/transitions-timeline';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { createControllers } from '@/controllers';
import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from '@/models/dashboard';

type TrendWindow = 7 | 30 | 90;

const TREND_WINDOWS: readonly TrendWindow[] = [7, 30, 90];

// RN35 - janelas de tendência selecionáveis na página (7/30/90). O backend devolve
// a série de 90 dias; o recorte da janela é só apresentação (ADR-018, sem RN).
function sliceWindow(trend: GetDashboardHabitsResponseDTO['trend'], window: TrendWindow) {
  return trend.length > window ? trend.slice(trend.length - window) : trend;
}

export default function DashboardPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [habits, setHabits] = useState<GetDashboardHabitsResponseDTO | null>(null);
  const [mastery, setMastery] = useState<GetDashboardMasteryResponseDTO | null>(null);
  const [proximity, setProximity] = useState<GetDashboardProximityResponseDTO | null>(null);
  const [window, setWindow] = useState<TrendWindow>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (): Promise<void> => {
    if (token === null) {
      return;
    }
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
    if (loading || token === null) {
      return;
    }
    let cancelled = false;
    fetchDashboard()
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar o dashboard');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, token, fetchDashboard]);

  if (loading) {
    return <p className="py-8 text-slate-500">Carregando…</p>;
  }

  if (user === null) {
    return <p className="py-8 text-slate-500">Você não está autenticado.</p>;
  }

  const trend = habits !== null ? sliceWindow(habits.trend, window) : [];

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-slate-500">Layout ativo · {user.activeLayout}</span>
      </div>

      {errorMessage !== null && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      {habits === null && mastery === null && proximity === null && errorMessage === null ? (
        <p className="py-8 text-slate-500">Carregando…</p>
      ) : (
        <>
          <section aria-label="Indicadores (janela 30d)">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Indicadores</h2>
            <KpiCards kpis={habits?.kpis ?? EMPTY_KPIS} activeDays={habits?.kpis.daysActive ?? 0} />
          </section>

          <section aria-label="Evolução">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500">Evolução diária (RN35)</h2>
              <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
                {TREND_WINDOWS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWindow(option)}
                    aria-pressed={window === option}
                    className={`rounded px-3 py-1 ${
                      window === option ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {option}d
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TrendChart title="PPM (palavras por minuto)" points={trend} metric="netWpm" color="#6366f1" />
              <TrendChart title="Precisão" points={trend} metric="accuracy" color="#10b981" />
              <TrendChart title="Latência média" points={trend} metric="averageLatencyMs" color="#f59e0b" />
            </div>
          </section>

          <section aria-label="Mapa de calor de teclas">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              Intensidade de prática por tecla (RN34 · janela 7d)
            </h2>
            {habits !== null && habits.heatmap.length > 0 ? (
              <HeatmapKeyboard layout={user.activeLayout} heatmap={habits.heatmap} />
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Ainda não há prática registrada na janela de 7 dias.
              </p>
            )}
          </section>

          <section aria-label="Proximidade à maestria">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Proximidade à maestria (RN36)</h2>
            <ProximityList keys={proximity?.keys ?? []} />
          </section>

          <section aria-label="Distribuição de estados">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Distribuição de estados</h2>
            <StateDistribution counts={mastery?.countsByState ?? EMPTY_COUNTS} />
          </section>

          <section aria-label="Transições de maestria">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Linha do tempo de maestria (RN36)</h2>
            <TransitionsTimeline transitions={mastery?.transitions ?? []} />
          </section>

          {habits !== null && habits.trend.length > 0 && (
            <p className="text-xs text-slate-400">
              Último dia com prática: {formatDateKey(habits.trend[habits.trend.length - 1].date)}
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
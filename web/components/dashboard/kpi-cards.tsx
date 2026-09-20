'use client';

import type { ReactNode } from 'react';

import type { DashboardKPI } from '@/models/dashboard';
import { formatMs, formatPercent, formatWpm } from './dashboard-meta';

interface KpiCardsProps {
  kpis: DashboardKPI;
  activeDays: number;
}

// Widget 1 — cards de KPI (janela 30d).
function KpiStat({ label, value, hint }: { label: string; value: string; hint?: string }): ReactNode {
  return (
    <div className="rounded-lg bg-slate-900 px-4 py-3">
      <p className="text-xs text-slate-400">
        {label}
        {hint !== undefined && <span className="ml-1 text-slate-500">({hint})</span>}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function KpiCards({ kpis, activeDays }: KpiCardsProps): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiStat label="PPM médio" value={formatWpm(kpis.netWpm)} hint="30d" />
      <KpiStat label="Precisão" value={formatPercent(kpis.accuracy)} hint="30d" />
      <KpiStat label="Latência média" value={formatMs(kpis.averageLatencyMs)} hint="30d" />
      <KpiStat label="Sessões concluídas" value={String(kpis.sessionsCompleted)} hint="30d" />
      <KpiStat label="Dias ativos" value={String(activeDays)} hint="30d" />
      <KpiStat label="Teclas praticadas" value={String(kpis.keysPracticed)} hint="30d" />
    </div>
  );
}
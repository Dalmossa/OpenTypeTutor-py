'use client';

import type { ReactNode } from 'react';

import type { DashboardKPI, DashboardKPIWithComparison, PeriodComparison } from '@/models/dashboard';
import { formatMs, formatPercent, formatWpm } from './dashboard-meta';

interface KpiCardsProps {
  kpis: DashboardKPIWithComparison;
  activeDays: number;
}

function formatDelta(delta: number, deltaPercent: number | null, metricType: 'wpm' | 'accuracy' | 'latency' | 'count'): ReactNode {
  if (deltaPercent === null) {
    return <span className="text-xs text-slate-400">sem dados anteriores</span>;
  }
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const absDelta = Math.abs(delta);
  const absPercent = Math.abs(deltaPercent);
  
  let deltaText: string;
  if (metricType === 'wpm') {
    deltaText = `${absDelta.toFixed(1)} PPM`;
  } else if (metricType === 'accuracy') {
    deltaText = `${absPercent.toFixed(1)}%`;
  } else if (metricType === 'latency') {
    deltaText = `${Math.round(absDelta)} ms`;
  } else {
    deltaText = `${absDelta}`;
  }

  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-500'}`}>
      {isPositive ? '▲' : isNegative ? '▼' : '●'} {deltaText} ({absPercent.toFixed(1)}%)
    </span>
  );
}

function KpiStat({ 
  label, 
  value, 
  hint, 
  comparison 
}: { 
  label: string; 
  value: string; 
  hint?: string; 
  comparison?: PeriodComparison<number>;
}): ReactNode {
  return (
    <div className="rounded-lg bg-slate-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {label}
          {hint !== undefined && <span className="ml-1 text-slate-500">({hint})</span>}
        </p>
        {comparison && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            vs período anterior
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
      {comparison && (
        <p className="mt-1 flex items-center gap-1">
          {formatDelta(comparison.delta, comparison.deltaPercent, 'wpm')}
        </p>
      )}
    </div>
  );
}

export function KpiCards({ kpis, activeDays }: KpiCardsProps): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiStat 
        label="PPM médio" 
        value={formatWpm(kpis.netWpm)} 
        hint="30d"
        comparison={kpis.netWpmComparison}
      />
      <KpiStat 
        label="Precisão" 
        value={formatPercent(kpis.accuracy)} 
        hint="30d"
        comparison={kpis.accuracyComparison}
      />
      <KpiStat 
        label="Latência média" 
        value={formatMs(kpis.averageLatencyMs)} 
        hint="30d"
        comparison={kpis.latencyComparison}
      />
      <KpiStat 
        label="Sessões concluídas" 
        value={String(kpis.sessionsCompleted)} 
        hint="30d"
        comparison={kpis.sessionsComparison}
      />
      <KpiStat 
        label="Dias ativos" 
        value={String(activeDays)} 
        hint="30d"
        comparison={kpis.daysActiveComparison}
      />
      <KpiStat 
        label="Teclas praticadas" 
        value={String(kpis.keysPracticed)} 
        hint="30d"
        comparison={kpis.keysPracticedComparison}
      />
    </div>
  );
}
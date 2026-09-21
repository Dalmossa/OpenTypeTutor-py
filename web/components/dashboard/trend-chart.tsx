'use client';

import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardTrendPoint } from '@/models/dashboard';
import { formatDateKey, formatMs, formatPercent, formatWpm } from './dashboard-meta';

type TrendMetric = 'netWpm' | 'accuracy' | 'averageLatencyMs';

interface TrendChartProps {
  title: string;
  points: DashboardTrendPoint[];
  comparisonPoints?: DashboardTrendPoint[]; // período anterior
  metric: TrendMetric;
  color: string;
  comparisonColor?: string;
}

function yFormatter(metric: TrendMetric, value: number): string {
  if (metric === 'accuracy') {
    return formatPercent(value);
  }
  if (metric === 'averageLatencyMs') {
    return formatMs(value);
  }
  return formatWpm(value);
}

// Widgets 2-4 — linhas de evolução (PPM, precisão, latência). Série diária (RN35),
// janela selecionada na página (7/30/90/custom); linha tracejada = período anterior.
export function TrendChart({ title, points, comparisonPoints, metric, color, comparisonColor = '#94a3b8' }: TrendChartProps): ReactNode {
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        <p className="mt-3 text-sm text-slate-500">Sem dados na janela selecionada.</p>
      </div>
    );
  }

  // Combina pontos atuais + comparação para o tooltip
  const allPoints = [...points];
  if (comparisonPoints && comparisonPoints.length > 0) {
    for (const cp of comparisonPoints) {
      if (!allPoints.some(p => p.date === cp.date)) {
        allPoints.push(cp);
      }
    }
    allPoints.sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        {comparisonPoints && comparisonPoints.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-current" style={{ backgroundColor: color }} />
              <span>Atual</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: comparisonColor }} />
              <span>Período anterior</span>
            </span>
          </div>
        )}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={allPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateKey}
              tick={{ fontSize: 11 }}
              stroke="#64748b"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => yFormatter(metric, value)}
              tick={{ fontSize: 11 }}
              width={48}
              stroke="#64748b"
            />
            <Tooltip
              labelFormatter={(label) => formatDateKey(String(label))}
              formatter={(value, name) => {
                if (name === metric) {
                  return [yFormatter(metric, Number(value)), 'Atual'];
                }
                return [yFormatter(metric, Number(value)), 'Anterior'];
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            {comparisonPoints && comparisonPoints.length > 0 && (
              <Line
                type="monotone"
                dataKey={metric}
                stroke={comparisonColor}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
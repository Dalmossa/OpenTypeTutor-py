'use client';

import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardTrendPoint } from '@/models/dashboard';
import { formatDateKey, formatMs, formatPercent, formatWpm } from './dashboard-meta';

type TrendMetric = 'netWpm' | 'accuracy' | 'averageLatencyMs';

interface TrendChartProps {
  title: string;
  points: DashboardTrendPoint[];
  metric: TrendMetric;
  color: string;
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
// janela selecionada na página (7/30/90); o backend já devolve a série de 90d.
export function TrendChart({ title, points, metric, color }: TrendChartProps): ReactNode {
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        <p className="mt-3 text-sm text-slate-500">Sem dados na janela selecionada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              formatter={(value) => [yFormatter(metric, Number(value)), title]}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
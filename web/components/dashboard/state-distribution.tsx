'use client';

import type { ReactNode } from 'react';

import type { DashboardCountsByState } from '@/models/dashboard';
import type { MasteryState } from '@/models/progress';
import { MASTERY_BADGE_CLASS, MASTERY_LABELS } from './dashboard-meta';

interface StateDistributionProps {
  counts: DashboardCountsByState;
}

const STATE_ORDER: readonly MasteryState[] = ['UNKNOWN', 'LEARNING', 'CONSOLIDATING', 'MASTERED', 'WEAK'];

// Widget 8 — distribuição das teclas por estado de mastery. Rótulo junto da cor.
export function StateDistribution({ counts }: StateDistributionProps): ReactNode {
  const total = STATE_ORDER.reduce((sum, state) => sum + counts[state], 0);

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <h3 className="text-sm font-semibold text-ink-muted">Distribuição por estado de maestria</h3>
      {total === 0 ? (
        <p className="mt-3 text-sm text-ink-subtle">Nenhuma tecla com métricas ainda.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {STATE_ORDER.map((state) => {
            const value = counts[state];
            const percent = Math.round((value / total) * 100);
            return (
              <li key={state} className="flex items-center gap-3 text-sm">
                <span className={`w-28 rounded-full px-2 py-0.5 text-center text-xs font-medium ${MASTERY_BADGE_CLASS[state]}`}>
                  {MASTERY_LABELS[state]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-xs text-ink-muted">
                  {value} · {percent}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
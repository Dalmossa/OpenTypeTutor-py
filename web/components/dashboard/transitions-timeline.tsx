'use client';

import type { ReactNode } from 'react';

import type { DashboardTransition } from '@/models/dashboard';
import { formatDateKey, isMasteryState, MASTERY_BADGE_CLASS, MASTERY_LABELS } from './dashboard-meta';

interface TransitionsTimelineProps {
  transitions: DashboardTransition[];
}

function stateChip(state: string): ReactNode {
  const className = isMasteryState(state)
    ? MASTERY_BADGE_CLASS[state]
    : 'bg-chip-neutral-bg text-chip-neutral-fg';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {isMasteryState(state) ? MASTERY_LABELS[state] : state}
    </span>
  );
}

// Widget 7 — timeline de transições de mastery (janela 90d). Rótulo junto da cor.
export function TransitionsTimeline({ transitions }: TransitionsTimelineProps): ReactNode {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <h3 className="text-sm font-semibold text-ink-muted">Transições de maestria (janela 90d)</h3>
      {transitions.length === 0 ? (
        <p className="mt-3 text-sm text-ink-subtle">
          Nenhuma mudança de estado nas últimas 90 dias — continue praticando para ver sua evolução.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {transitions.map((transition, index) => (
            <li
              key={`${transition.date}-${transition.logicalKey}-${index}`}
              className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm"
            >
              <span className="w-8 rounded-md bg-surface-3 py-1 text-center font-mono text-sm text-ink">
                {transition.logicalKey === ' ' ? '␣' : transition.logicalKey}
              </span>
              <span className="font-mono text-xs text-ink-subtle">{formatDateKey(transition.date)}</span>
              <span className="flex items-center gap-2">
                {stateChip(transition.from)}
                <span aria-hidden="true" className="text-ink-tertiary">→</span>
                {stateChip(transition.to)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
'use client';

import type { ReactNode } from 'react';

import type { DashboardProximityKey } from '@/models/dashboard';
import { BAND_CHIP_CLASS, formatPercent } from './dashboard-meta';

interface ProximityListProps {
  keys: DashboardProximityKey[];
}

// Widget 6 — proximidade de cada tecla à maestria (RN36). Ordenado por MPI asc;
// rótulo pt-BR sempre junto da cor (cor nunca sozinha).
export function ProximityList({ keys }: ProximityListProps): ReactNode {
  const ordered = [...keys].sort((a, b) => a.mpi - b.mpi || a.logicalKey.localeCompare(b.logicalKey));

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <h3 className="text-sm font-semibold text-ink-muted">Distância à maestria (RN36)</h3>
      {ordered.length === 0 ? (
        <p className="mt-3 text-sm text-ink-subtle">Nenhuma tecla praticada ainda.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {ordered.map((key) => {
            const bandClass = BAND_CHIP_CLASS[key.band] ?? 'bg-chip-neutral-bg text-chip-neutral-fg';
            return (
              <li
                key={key.logicalKey}
                className="flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2"
              >
                <span className="w-8 rounded-md bg-surface-3 py-1 text-center font-mono text-sm text-ink">
                  {key.logicalKey === ' ' ? '␣' : key.logicalKey}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandClass}`}>
                  {key.band}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(key.mpi * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink-muted">{formatPercent(key.mpi)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
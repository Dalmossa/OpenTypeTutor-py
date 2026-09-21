'use client';

import type { ReactNode } from 'react';

interface StreakCardProps {
  label: string;
  value: number;
  maxValue?: number;
  hint?: string;
}

function StreakCard({ label, value, maxValue, hint }: StreakCardProps): ReactNode {
  const percent = maxValue ? Math.round((value / maxValue) * 100) : 0;
  
  return (
    <div className="rounded-lg bg-surface-1 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-subtle">
          {label}
          {hint !== undefined && <span className="ml-1 text-ink-tertiary">({hint})</span>}
        </p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {maxValue && maxValue > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
      {maxValue && maxValue > 0 && (
        <p className="mt-1 text-xs text-ink-tertiary">Recorde: {maxValue} dias</p>
      )}
    </div>
  );
}

export function StreakCards({ 
  currentStreak, 
  longestStreak 
}: { 
  currentStreak: number; 
  longestStreak: number; 
}): ReactNode {
  if (currentStreak === 0 && longestStreak === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <StreakCard 
        label="Streak atual" 
        value={currentStreak} 
        maxValue={longestStreak} 
        hint="dias consecutivos" 
      />
      <StreakCard 
        label="Maior streak" 
        value={longestStreak} 
        hint="recorde histórico" 
      />
    </div>
  );
}
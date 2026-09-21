'use client';

import type { ReactNode } from 'react';

import { buildKeyboardModel } from '@/lib/virtual-keyboard';
import type { DashboardHeatmapKey } from '@/models/dashboard';
import { useTheme } from '@/components/theme-provider';

interface HeatmapKeyboardProps {
  layout: string;
  heatmap: DashboardHeatmapKey[];
}

const BG_HEX = '#0f1011';
const NEUTRAL_HEX = '#23252a';
const KEY_TEXT_HEX = '#f7f8f8';
const KEY_DIM_HEX = '#d5dae3';
const LIGHT_BG_HEX = '#ffffff';
const LIGHT_NEUTRAL_HEX = '#d9dce0';
const LIGHT_KEY_TEXT_HEX = '#181a1d';
const LIGHT_KEY_DIM_HEX = '#454b52';
const HOT_HEX = '#7c3aed';

function mix(hexA: string, hexB: string, t: number): string {
  const rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ra, ga, ba] = rgb(hexA);
  const [rb, gb, bb] = rgb(hexB);
  const toHex = (v: number): string => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(ra * t + rb * (1 - t))}${toHex(ga * t + gb * (1 - t))}${toHex(ba * t + bb * (1 - t))}`;
}

// Widget 5 — teclado heatmap (RN34). Intensidade da cor = acionamentos na janela
// de 7 dias; título na tecla mostra contagem + dias ativos (a11y).
export function HeatmapKeyboard({ layout, heatmap }: HeatmapKeyboardProps): ReactNode {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const bgHex = isLight ? LIGHT_BG_HEX : BG_HEX;
  const neutralHex = isLight ? LIGHT_NEUTRAL_HEX : NEUTRAL_HEX;
  const keyTextHex = isLight ? LIGHT_KEY_TEXT_HEX : KEY_TEXT_HEX;
  const keyDimHex = isLight ? LIGHT_KEY_DIM_HEX : KEY_DIM_HEX;
  const model = buildKeyboardModel(layout);
  const byKey = new Map<string, DashboardHeatmapKey>();
  let maxCount = 0;
  for (const entry of heatmap) {
    byKey.set(entry.logicalKey, entry);
    if (entry.count > maxCount) {
      maxCount = entry.count;
    }
  }

  const backgroundFor = (logicalKey: string): { background: string; color: string } => {
    const entry = byKey.get(logicalKey);
    if (entry === undefined || maxCount === 0) {
      return { background: mix(HOT_HEX, bgHex, 0.06), color: keyTextHex };
    }
    const intensity = entry.count / maxCount;
    return {
      background: mix(neutralHex, HOT_HEX, 0.15 + 0.85 * intensity),
      color: intensity > 0.5 ? keyTextHex : keyDimHex,
    };
  };

  const keyInfo = (logicalKey: string): string | undefined => {
    const entry = byKey.get(logicalKey);
    if (entry === undefined) {
      return 'Tecla sem prática na janela';
    }
    return `${entry.count} acionamento${entry.count === 1 ? '' : 's'} · ${entry.activeDays} dia${entry.activeDays === 1 ? '' : 's'} ativo${entry.activeDays === 1 ? '' : 's'}`;
  };

  const numpad = model.numpad.flat().filter((key) => key !== null);

  return (
    <div>
      <div className="rounded-xl border border-hairline-strong bg-surface-1 p-3">
        <div className="flex flex-col gap-1.5" aria-label={`Mapa de calor ${model.name}`}>
          {model.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {row.map((key, colIndex) => {
                const style = backgroundFor(key.label);
                const info = keyInfo(key.label);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}-${key.label}`}
                    data-key={key.label}
                    data-testid={`heat-key-${key.label}`}
                    title={info}
                    aria-label={info}
                    className="flex h-10 flex-1 items-center justify-center overflow-hidden rounded-md border border-hairline text-sm font-medium"
                    style={{ backgroundColor: style.background, color: style.color, minWidth: 0 }}
                  >
                    <span className="truncate">{key.display}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: neutralHex }} />
          sem prática
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: mix(HOT_HEX, bgHex, 0.2) }} />
          baixo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: HOT_HEX }} />
          alto
        </span>
        <span className="text-ink-tertiary">Teclas sem dados ({byKey.size} praticadas das {numpad.length + model.rows.flat().length})</span>
      </div>
    </div>
  );
}
'use client';

import type { ReactNode } from 'react';

import {
  buildKeyboardModel,
  FINGER_COLORS,
  FINGER_NAMES,
  type FingerZone,
} from '@/lib/virtual-keyboard';
import { useTheme } from '@/components/theme-provider';

interface KeyboardPalette {
  bg: string;
  border: string;
  pressedBg: string;
  keyText: string;
  captionClass: string;
}

const DARK_PALETTE: KeyboardPalette = {
  bg: '#0f1011',
  border: '#23252a',
  pressedBg: '#f7f8f8',
  keyText: '#f7f8f8',
  captionClass: 'text-ink-muted/70',
};

const LIGHT_PALETTE: KeyboardPalette = {
  bg: '#ffffff',
  border: '#d9dce0',
  pressedBg: '#181a1d',
  keyText: '#181a1d',
  captionClass: 'text-ink-tertiary/70',
};

interface VirtualKeyboardProps {
  layout: string;
  pressedKeys: ReadonlySet<string>;
  hintKey?: string | null;
}

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

function keyStyle(key: { label: string; color: string; width: number }, pressed: boolean, hinted: boolean, palette: KeyboardPalette) {
  const flex = Math.round(key.width * 100);
  if (pressed) {
    return {
      flexGrow: flex,
      flexBasis: 0,
      minWidth: 0,
      backgroundColor: palette.pressedBg,
      color: key.color,
      borderColor: key.color,
      boxShadow: `0 0 0 1px ${key.color}, 0 0 10px ${key.color}`,
      transform: 'translateY(1px)',
    };
  }
  if (hinted) {
    return {
      flexGrow: flex,
      flexBasis: 0,
      minWidth: 0,
      backgroundColor: mix(key.color, palette.bg, 0.45),
      color: palette.keyText,
      borderColor: key.color,
      boxShadow: `0 0 0 2px ${key.color}`,
    };
  }
  return {
    flexGrow: flex,
    flexBasis: 0,
    minWidth: 0,
    backgroundColor: mix(key.color, palette.bg, 0.16),
    color: palette.keyText,
    borderColor: mix(key.color, palette.border, 0.35),
  };
}

export default function VirtualKeyboard({ layout, pressedKeys, hintKey = null }: VirtualKeyboardProps): ReactNode {
  const { theme } = useTheme();
  const palette = theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  const model = buildKeyboardModel(layout);
  const leftFingers: FingerZone[] = ['L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX'];
  const rightFingers: FingerZone[] = ['R_INDEX', 'R_MIDDLE', 'R_RING', 'R_PINKY'];

  return (
    <div className="rounded-xl border border-hairline-strong bg-surface-1 p-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5" aria-label={`Teclado virtual ${model.name}`}>
{model.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1.5">
            {row.map((key, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}-${key.label}`}
                data-key={key.label}
                data-hint={hintKey === key.label ? 'true' : 'false'}
                className={`relative flex h-10 items-center justify-center overflow-hidden rounded-md border text-sm font-medium transition-none ${hintKey === key.label ? 'ott-key-hint' : ''}`}
                style={keyStyle(key, pressedKeys.has(key.label), hintKey === key.label, palette)}
              >
                {key.caption?.shift !== undefined && (
                  <span className={`absolute left-1 top-0.5 text-[10px] leading-none ${palette.captionClass}`}>
                    {key.caption.shift}
                  </span>
                )}
                {key.caption?.altgr !== undefined && (
                  <span className={`absolute bottom-0.5 left-1 text-[10px] leading-none ${palette.captionClass}`}>
                    {key.caption.altgr}
                  </span>
                )}
                <span className={key.caption?.shift !== undefined ? 'translate-y-1' : undefined}>
                  {key.display}
                </span>
              </div>
            ))}
          </div>
        ))}
        </div>

        <div
          className="grid w-40 shrink-0 grid-cols-4 gap-1.5"
          aria-label="Teclado numérico"
        >
        {model.numpad.flatMap((row, rowIndex) =>
          row.map((key, colIndex) => {
            if (key === null) {
              return null;
            }
            return (
              <div
                key={`n-${rowIndex}-${colIndex}-${key.label}`}
                data-key={key.label}
                data-hint={hintKey === key.label ? 'true' : 'false'}
                className={`flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-none ${hintKey === key.label ? 'ott-key-hint' : ''}`}
                style={{
                  ...keyStyle(key, pressedKeys.has(key.label), hintKey === key.label, palette),
                  gridColumn: `${colIndex + 1} / span ${key.spanX ?? 1}`,
                  gridRow: `${rowIndex + 1} / span ${key.spanY ?? 1}`,
                }}
              >
                {key.display}
              </div>
            );
          }),
        )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-ink-tertiary">Esquerda</span>
        {leftFingers.map((finger) => (
          <LegendChip key={finger} finger={finger} />
        ))}
        <span className="text-ink-tertiary">Direita</span>
        {rightFingers.map((finger) => (
          <LegendChip key={finger} finger={finger} />
        ))}
        <span className="ml-2 inline-flex items-center gap-1 text-ink-tertiary">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: FINGER_COLORS.THUMB }}
          />
          {FINGER_NAMES.THUMB}
        </span>
      </div>
    </div>
  );
}

function LegendChip({ finger }: { finger: FingerZone }): ReactNode {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: FINGER_COLORS[finger] }} />
      <span className="text-ink-muted">{FINGER_NAMES[finger]}</span>
    </span>
  );
}
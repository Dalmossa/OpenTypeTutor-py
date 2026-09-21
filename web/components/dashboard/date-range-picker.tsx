"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useEffect, useRef } from "react";

import { CustomDateRange, PresetWindow, TrendWindow } from "@/models/dashboard";

const PRESETS: readonly { label: string; value: TrendWindow }[] = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "Personalizado", value: "custom" },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export interface DateRangePickerProps {
  value: PresetWindow | CustomDateRange;
  onChange: (value: PresetWindow | CustomDateRange) => void;
  maxDate?: Date;
}

export function DateRangePicker({
  value,
  onChange,
  maxDate = new Date(),
}: DateRangePickerProps): ReactNode {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sincroniza inputs custom quando value muda externamente
  useEffect(() => {
    if (typeof value === "object" && "start" in value) {
      setCustomStart(value.start);
      setCustomEnd(value.end);
    }
  }, [value]);

  const handlePresetClick = useCallback(
    (presetValue: TrendWindow | "custom") => {
      if (presetValue === "custom") {
        setIsCustomOpen(true);
        // Pré-preenche com últimos 30 dias se vazio
        if (!customStart) {
          const end = maxDate;
          const start = addDays(maxDate, -29);
          setCustomStart(formatDateInput(start));
          setCustomEnd(formatDateInput(end));
        }
      } else {
        onChange(presetValue);
        setIsCustomOpen(false);
      }
    },
    [onChange, customStart, maxDate],
  );

  const handleCustomSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const start = parseDateInput(customStart);
      const end = parseDateInput(customEnd);
      if (start && end && start <= end && end <= maxDate) {
        onChange({
          kind: "custom",
          start: formatDateInput(start),
          end: formatDateInput(end),
        });
        setIsCustomOpen(false);
      }
    },
    [customStart, customEnd, onChange, maxDate],
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
      setIsCustomOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const isPresetActive = (presetValue: TrendWindow) => {
    if (presetValue === "custom") {
      return typeof value === "object" && value.kind === "custom";
    }
    return value === presetValue;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex rounded-md border border-hairline-strong p-0.5 text-sm">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            aria-pressed={isPresetActive(preset.value)}
            className={`rounded px-3 py-1 transition-colors ${
              isPresetActive(preset.value)
                ? "bg-primary text-white"
                : "text-ink-muted hover:bg-surface-2"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {isCustomOpen && (
        <div
          className="absolute z-10 mt-2 w-64 rounded-lg border border-hairline bg-surface-1 p-3 shadow-lg"
          role="dialog"
          aria-label="Selecionar intervalo personalizado"
        >
          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="custom-start"
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Início
              </label>
              <input
                id="custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={formatDateInput(maxDate)}
                className="w-full rounded-md border border-hairline-strong bg-surface-1 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="custom-end"
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Fim
              </label>
              <input
                id="custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={formatDateInput(maxDate)}
                className="w-full rounded-md border border-hairline-strong bg-surface-1 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover"
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

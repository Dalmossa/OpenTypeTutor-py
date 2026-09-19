import { describe, expect, it } from 'vitest';
import { Timezone, DEFAULT_TIMEZONE } from './Timezone.js';

describe('RN37 - Timezone (fuso horário do usuário)', () => {
  it('RN37 - default do produto é America/Sao_Paulo', () => {
    expect(DEFAULT_TIMEZONE).toBe('America/Sao_Paulo');
    expect(Timezone.createDefault().value).toBe('America/Sao_Paulo');
    expect(Timezone.createDefault().isDefault).toBe(true);
  });

  it('RN37 - aceita nome IANA válido e rejeita inválidos', () => {
    expect(Timezone.create({ value: 'America/Sao_Paulo' }).value).toBe('America/Sao_Paulo');
    expect(Timezone.create({ value: 'UTC' }).value).toBe('UTC');
    expect(() => Timezone.create({ value: 'Not/AZone' })).toThrow();
    expect(() => Timezone.create({ value: '' })).toThrow();
  });

  it('RN37 - toLocalDateKey converte UTC para o dia calendário local do usuário', () => {
    const instant = new Date('2026-01-01T00:30:00.000Z');

    const saoPaulo = Timezone.create({ value: 'America/Sao_Paulo' }); // UTC-3
    expect(saoPaulo.toLocalDateKey(instant)).toBe('2025-12-31'); // 21:30 do dia anterior

    const kiritimati = Timezone.create({ value: 'Pacific/Kiritimati' }); // UTC+14
    expect(kiritimati.toLocalDateKey(instant)).toBe('2026-01-01'); // 14:30 do mesmo dia

    const utc = Timezone.create({ value: 'UTC' });
    expect(utc.toLocalDateKey(instant)).toBe('2026-01-01');
  });

  it('RN37 - igualdade pelo nome IANA', () => {
    expect(
      Timezone.create({ value: 'America/Sao_Paulo' }).equals(Timezone.createDefault())
    ).toBe(true);
    expect(
      Timezone.create({ value: 'UTC' }).equals(Timezone.createDefault())
    ).toBe(false);
  });
});
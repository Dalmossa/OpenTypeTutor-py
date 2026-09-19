export interface TimezoneProps {
  value: string; // nome IANA (ex.: America/Sao_Paulo)
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// RN37 - fuso horário do usuário define o dia calendário local usado na agregação diária (RN35).
function isValidIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export class Timezone {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(props: TimezoneProps): Timezone {
    if (typeof props.value !== 'string' || props.value.length === 0) {
      throw new Error('Fuso horário obrigatório');
    }
    if (!isValidIanaTimezone(props.value)) {
      throw new Error(`Fuso horário inválido: ${props.value}`);
    }
    return new Timezone(props.value);
  }

  static createDefault(): Timezone {
    return new Timezone(DEFAULT_TIMEZONE);
  }

  get isDefault(): boolean {
    return this.value === DEFAULT_TIMEZONE;
  }

  // RN37 - chave do dia calendário local (YYYY-MM-DD) — conversão na escrita dos rótulos/agregados
  toLocalDateKey(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.value,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return parts; // en-CA formata como YYYY-MM-DD
  }

  equals(other: Timezone): boolean {
    return this.value === other.value;
  }
}

export { DEFAULT_TIMEZONE };
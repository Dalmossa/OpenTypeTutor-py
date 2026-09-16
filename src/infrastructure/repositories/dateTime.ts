export function toIso(date: Date): string {
  return date.toISOString();
}

export function toIsoOrNull(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}

export function fromIso(value: string): Date {
  return new Date(value);
}

export function fromIsoOrNull(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}
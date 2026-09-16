const VALID_LAYOUTS = ['ABNT2', 'US-INTERNATIONAL'] as const;

export type LayoutValue = (typeof VALID_LAYOUTS)[number];

export class Layout {
  readonly value: LayoutValue;

  private constructor(value: LayoutValue) {
    this.value = value;
  }

  static create(value: string): Layout {
    if (!VALID_LAYOUTS.includes(value as LayoutValue)) {
      throw new Error('Layout inválido');
    }
    return new Layout(value as LayoutValue);
  }

  equals(other: Layout): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
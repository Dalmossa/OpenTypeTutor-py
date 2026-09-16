const VALID_PHASES = [
  'ERGONOMICS_SETUP',
  'HOME_ROW',
  'UPPER_LOWER_ROWS',
  'WORD_FIXATION',
  'ACCENTUATION',
  'LONG_TEXTS',
  'NUMERIC_KEYPAD',
] as const;

export type PedagogicalPhaseValue = (typeof VALID_PHASES)[number];

export class PedagogicalPhase {
  readonly value: PedagogicalPhaseValue;

  private constructor(value: PedagogicalPhaseValue) {
    this.value = value;
  }

  static create(value: string): PedagogicalPhase {
    if (!VALID_PHASES.includes(value as PedagogicalPhaseValue)) {
      throw new Error('Fase pedagógica inválida');
    }
    return new PedagogicalPhase(value as PedagogicalPhaseValue);
  }

  static getAll(): PedagogicalPhase[] {
    return VALID_PHASES.map(v => new PedagogicalPhase(v));
  }

  getOrder(): number {
    const order: Record<PedagogicalPhaseValue, number> = {
      ERGONOMICS_SETUP: 0,
      HOME_ROW: 1,
      UPPER_LOWER_ROWS: 2,
      WORD_FIXATION: 3,
      ACCENTUATION: 4,
      LONG_TEXTS: 5,
      NUMERIC_KEYPAD: 6,
    };
    return order[this.value];
  }

  getNext(): PedagogicalPhase | null {
    const currentOrder = this.getOrder();
    if (currentOrder >= VALID_PHASES.length - 1) {
      return null;
    }
    const nextValue = VALID_PHASES[currentOrder + 1];
    return nextValue ? new PedagogicalPhase(nextValue) : null;
  }

  getPrevious(): PedagogicalPhase | null {
    const currentOrder = this.getOrder();
    if (currentOrder <= 0) {
      return null;
    }
    const prevValue = VALID_PHASES[currentOrder - 1];
    return prevValue ? new PedagogicalPhase(prevValue) : null;
  }

  equals(other: PedagogicalPhase): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
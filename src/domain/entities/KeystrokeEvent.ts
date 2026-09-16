export type EventType = 'CORRECT' | 'INCORRECT' | 'CORRECTION' | 'DEAD_KEY_COMPOSE';

export interface KeystrokeEventProps {
  expectedKey: string;
  typedKey: string | null;
  physicalKey: string;
  logicalKey: string;
  eventType: EventType;
  timestampMs: number;
  latencyMs: number | null;
  composedCharacter: string | null;
}

export class KeystrokeEvent {
  readonly expectedKey: string;
  readonly typedKey: string | null;
  readonly physicalKey: string;
  readonly logicalKey: string;
  readonly eventType: EventType;
  readonly timestampMs: number;
  readonly latencyMs: number | null;
  readonly composedCharacter: string | null;

  private constructor(props: KeystrokeEventProps) {
    this.expectedKey = props.expectedKey;
    this.typedKey = props.typedKey;
    this.physicalKey = props.physicalKey;
    this.logicalKey = props.logicalKey;
    this.eventType = props.eventType;
    this.timestampMs = props.timestampMs;
    this.latencyMs = props.latencyMs;
    this.composedCharacter = props.composedCharacter;
  }

  static create(props: KeystrokeEventProps): KeystrokeEvent {
    const validEventTypes: EventType[] = ['CORRECT', 'INCORRECT', 'CORRECTION', 'DEAD_KEY_COMPOSE'];

    if (!validEventTypes.includes(props.eventType)) {
      throw new Error('EventType inválido');
    }

    if (props.timestampMs < 0) {
      throw new Error('Timestamp deve ser não-negativo');
    }

    if (props.latencyMs !== null && props.latencyMs < 0) {
      throw new Error('Latency deve ser não-negativo ou null');
    }

    return new KeystrokeEvent(props);
  }

  isCorrect(): boolean {
    return this.eventType === 'CORRECT';
  }

  isIncorrect(): boolean {
    return this.eventType === 'INCORRECT';
  }

  isCorrection(): boolean {
    return this.eventType === 'CORRECTION';
  }

  isDeadKeyCompose(): boolean {
    return this.eventType === 'DEAD_KEY_COMPOSE';
  }

  isControlKey(): boolean {
    const controlKeys = ['Shift', 'Control', 'Alt', 'Delete', 'Tab', 'CapsLock', 'Backspace'];
    return controlKeys.includes(this.physicalKey) || this.logicalKey === 'Backspace';
  }

  toJSON(): KeystrokeEventProps {
    return {
      expectedKey: this.expectedKey,
      typedKey: this.typedKey,
      physicalKey: this.physicalKey,
      logicalKey: this.logicalKey,
      eventType: this.eventType,
      timestampMs: this.timestampMs,
      latencyMs: this.latencyMs,
      composedCharacter: this.composedCharacter,
    };
  }
}
export interface SessionMetricsProps {
  charactersTyped: number;
  correctCharacters: number;
  incorrectCharacters: number;
  correctedErrors: number;
  finalUncorrectedErrors: number;
  accuracy: number;
  grossWpm: number;
  netWpm: number;
  activeDurationMs: number;
  averageLatencyMs: number;
}

export class SessionMetrics {
  readonly charactersTyped: number;
  readonly correctCharacters: number;
  readonly incorrectCharacters: number;
  readonly correctedErrors: number;
  readonly finalUncorrectedErrors: number;
  readonly accuracy: number;
  readonly grossWpm: number;
  readonly netWpm: number;
  readonly activeDurationMs: number;
  readonly averageLatencyMs: number;

  private constructor(props: SessionMetricsProps) {
    this.charactersTyped = props.charactersTyped;
    this.correctCharacters = props.correctCharacters;
    this.incorrectCharacters = props.incorrectCharacters;
    this.correctedErrors = props.correctedErrors;
    this.finalUncorrectedErrors = props.finalUncorrectedErrors;
    this.accuracy = props.accuracy;
    this.grossWpm = props.grossWpm;
    this.netWpm = props.netWpm;
    this.activeDurationMs = props.activeDurationMs;
    this.averageLatencyMs = props.averageLatencyMs;
  }

  static create(props: SessionMetricsProps): SessionMetrics {
    if (props.charactersTyped < 0) {
      throw new Error('Characters typed não pode ser negativo');
    }

    if (props.correctCharacters < 0) {
      throw new Error('Correct characters não pode ser negativo');
    }

    if (props.incorrectCharacters < 0) {
      throw new Error('Incorrect characters não pode ser negativo');
    }

    if (props.correctedErrors < 0) {
      throw new Error('Corrected errors não pode ser negativo');
    }

    if (props.finalUncorrectedErrors < 0) {
      throw new Error('Final uncorrected errors não pode ser negativo');
    }

    if (props.accuracy < 0 || props.accuracy > 1) {
      throw new Error('Accuracy deve estar entre 0 e 1');
    }

    if (props.grossWpm < 0) {
      throw new Error('Gross WPM não pode ser negativo');
    }

    if (props.netWpm < 0) {
      throw new Error('Net WPM não pode ser negativo');
    }

    if (props.activeDurationMs < 0) {
      throw new Error('Active duration não pode ser negativo');
    }

    if (props.averageLatencyMs < 0) {
      throw new Error('Average latency não pode ser negativo');
    }

    return new SessionMetrics(props);
  }

  static insufficientData(): SessionMetrics {
    return new SessionMetrics({
      charactersTyped: 0,
      correctCharacters: 0,
      incorrectCharacters: 0,
      correctedErrors: 0,
      finalUncorrectedErrors: 0,
      accuracy: 0,
      grossWpm: 0,
      netWpm: 0,
      activeDurationMs: 0,
      averageLatencyMs: 0,
    });
  }

  isInsufficientData(): boolean {
    return this.charactersTyped === 0 && this.activeDurationMs === 0;
  }

  toJSON(): SessionMetricsProps {
    return {
      charactersTyped: this.charactersTyped,
      correctCharacters: this.correctCharacters,
      incorrectCharacters: this.incorrectCharacters,
      correctedErrors: this.correctedErrors,
      finalUncorrectedErrors: this.finalUncorrectedErrors,
      accuracy: this.accuracy,
      grossWpm: this.grossWpm,
      netWpm: this.netWpm,
      activeDurationMs: this.activeDurationMs,
      averageLatencyMs: this.averageLatencyMs,
    };
  }
}
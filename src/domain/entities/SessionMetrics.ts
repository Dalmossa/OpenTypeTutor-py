import { adaptiveParams } from "../config/adaptiveParams.js";

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
  /**
   * RN22 - derivado, nunca informado pelo chamador.
   *
   * Ver `isInsufficientDataFor`. Derivar aqui, e não receber como prop, é o que
   * impede a entidade de discordar de quem a construiu: `MetricsEngine` decide
   * zerar o WPM, e `GetLessonPerformance` decide descartar a sessão — as duas
   * decisões leem a mesma regra, calculada uma vez.
   */
  private readonly isInsufficient: boolean;

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
    this.isInsufficient = SessionMetrics.isInsufficientDataFor(
      props.activeDurationMs,
      props.charactersTyped,
    );
  }

  static create(props: SessionMetricsProps): SessionMetrics {
    if (props.charactersTyped < 0) {
      throw new Error("Characters typed não pode ser negativo");
    }

    if (props.correctCharacters < 0) {
      throw new Error("Correct characters não pode ser negativo");
    }

    if (props.incorrectCharacters < 0) {
      throw new Error("Incorrect characters não pode ser negativo");
    }

    if (props.correctedErrors < 0) {
      throw new Error("Corrected errors não pode ser negativo");
    }

    if (props.finalUncorrectedErrors < 0) {
      throw new Error("Final uncorrected errors não pode ser negativo");
    }

    if (props.accuracy < 0 || props.accuracy > 1) {
      throw new Error("Accuracy deve estar entre 0 e 1");
    }

    if (props.grossWpm < 0) {
      throw new Error("Gross WPM não pode ser negativo");
    }

    if (props.netWpm < 0) {
      throw new Error("Net WPM não pode ser negativo");
    }

    if (props.activeDurationMs < 0) {
      throw new Error("Active duration não pode ser negativo");
    }

    if (props.averageLatencyMs < 0) {
      throw new Error("Average latency não pode ser negativo");
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

  /**
   * RN22 - a regra de "dados insuficientes", em um único lugar.
   *
   * `activeDurationMs < INSUFFICIENT_DATA_MIN_DURATION_MS` **ou**
   * `charactersTyped < INSUFFICIENT_DATA_MIN_CHARS` → sessão insuficiente: o WPM
   * não é calculado. Os dois limiares vêm de `adaptiveParams` (PRD §26) — nunca
   * literais aqui.
   *
   * Estático e público de propósito: `MetricsEngine` precisa da resposta
   * *antes* de construir a entidade (é o que decide não calcular o WPM), e a
   * entidade precisa dela *depois* (é o que `isInsufficientData` devolve).
   * Duplicar a expressão nos dois lugares foi exatamente o defeito: a cópia do
   * `MetricsEngine` governava o WPM e a da entidade governava outra coisa, de
   * forma mais frouxa, então as duas divergiam.
   */
  static isInsufficientDataFor(
    activeDurationMs: number,
    charactersTyped: number,
  ): boolean {
    return (
      activeDurationMs < adaptiveParams.INSUFFICIENT_DATA_MIN_DURATION_MS ||
      charactersTyped < adaptiveParams.INSUFFICIENT_DATA_MIN_CHARS
    );
  }

  /**
   * A sessão tem dados insuficientes para WPM (RN22).
   *
   * Antes isto era `charactersTyped === 0 && activeDurationMs === 0`, que
   * respondia a uma pergunta diferente — "a sessão não tem nada" — e não à da
   * RN22. A diferença não é acadêmica: `GetLessonPerformance` descarta sessões
   * insuficientes do agregado de RN32, e uma sessão de 2s com 100 caracteres
   * (WPM zerado, sem significado) entrava no agregado como se fosse válida.
   */
  isInsufficientData(): boolean {
    return this.isInsufficient;
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

import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import type { SessionMetrics } from './SessionMetrics.js';

export interface DailyMetricsAggregateProps {
  userId: SessionId;
  layout: Layout;
  date: string; // YYYY-MM-DD no timezone local do usuário (RN37)
  sessionsCompleted?: number;
  totalActiveMs?: number;
  totalGrossChars?: number;
  totalCorrectChars?: number;
  totalErrors?: number;
  totalLatencyMs?: number;
  totalLatencySamples?: number;
  keysPracticed?: string[];
}

interface DailyMetricsAggregateInternalProps {
  userId: SessionId;
  layout: Layout;
  date: string;
  sessionsCompleted: number;
  totalActiveMs: number;
  totalGrossChars: number;
  totalCorrectChars: number;
  totalErrors: number;
  totalLatencyMs: number;
  totalLatencySamples: number;
  keys: Set<string>;
}

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// RN35 - agregado diário pré-computado por (userId, layout, date local RN37).
// Contadores somáveis alimentados pelo submit (RN14 idempotente); derivações só na leitura.
export class DailyMetricsAggregate {
  readonly userId: SessionId;
  readonly layout: Layout;
  readonly date: string; // YYYY-MM-DD local
  readonly sessionsCompleted: number;
  readonly totalActiveMs: number;
  readonly totalGrossChars: number;
  readonly totalCorrectChars: number;
  readonly totalErrors: number;
  readonly totalLatencyMs: number;
  readonly totalLatencySamples: number;

  private readonly keys: Set<string>;

  private constructor(props: DailyMetricsAggregateInternalProps) {
    this.userId = props.userId;
    this.layout = props.layout;
    this.date = props.date;
    this.sessionsCompleted = props.sessionsCompleted;
    this.totalActiveMs = props.totalActiveMs;
    this.totalGrossChars = props.totalGrossChars;
    this.totalCorrectChars = props.totalCorrectChars;
    this.totalErrors = props.totalErrors;
    this.totalLatencyMs = props.totalLatencyMs;
    this.totalLatencySamples = props.totalLatencySamples;
    this.keys = props.keys;
  }

  static create(props: DailyMetricsAggregateProps): DailyMetricsAggregate {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }
    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }
    if (!LOCAL_DATE_PATTERN.test(props.date)) {
      throw new Error('date deve ser um dia calendário local YYYY-MM-DD (RN37)');
    }

    return new DailyMetricsAggregate({
      userId: props.userId,
      layout: props.layout,
      date: props.date,
      sessionsCompleted: props.sessionsCompleted ?? 0,
      totalActiveMs: props.totalActiveMs ?? 0,
      totalGrossChars: props.totalGrossChars ?? 0,
      totalCorrectChars: props.totalCorrectChars ?? 0,
      totalErrors: props.totalErrors ?? 0,
      totalLatencyMs: props.totalLatencyMs ?? 0,
      totalLatencySamples: props.totalLatencySamples ?? 0,
      keys: new Set(props.keysPracticed ?? []),
    });
  }

  // RN35 - incorpora uma sessão concluída ao dia (RN14: re-submit não chega aqui duplicado pela camada de aplicação)
  merge(session: SessionMetrics, keys: string[]): DailyMetricsAggregate {
    const nextKeys = new Set(this.keys);
    for (const key of keys) {
      if (key.length > 0) nextKeys.add(key);
    }

    return new DailyMetricsAggregate({
      userId: this.userId,
      layout: this.layout,
      date: this.date,
      sessionsCompleted: this.sessionsCompleted + 1,
      totalActiveMs: this.totalActiveMs + session.activeDurationMs,
      totalGrossChars: this.totalGrossChars + session.charactersTyped,
      totalCorrectChars: this.totalCorrectChars + session.correctCharacters,
      totalErrors: this.totalErrors + session.incorrectCharacters,
      totalLatencyMs:
        this.totalLatencyMs + session.averageLatencyMs * session.charactersTyped,
      totalLatencySamples: this.totalLatencySamples + session.charactersTyped,
      keys: nextKeys,
    });
  }

  get keysPracticed(): string[] {
    return Array.from(this.keys);
  }

  // RN35 - derivações do dia (somente leitura)
  netWpm(): number {
    if (this.totalActiveMs === 0) return 0;
    return this.totalCorrectChars / 5 / (this.totalActiveMs / 60000);
  }

  accuracy(): number {
    if (this.totalGrossChars === 0) return 0;
    return this.totalCorrectChars / this.totalGrossChars;
  }

  averageLatencyMs(): number {
    if (this.totalLatencySamples === 0) return 0;
    return this.totalLatencyMs / this.totalLatencySamples;
  }

  toProps(): DailyMetricsAggregateInternalProps {
    return {
      userId: this.userId,
      layout: this.layout,
      date: this.date,
      sessionsCompleted: this.sessionsCompleted,
      totalActiveMs: this.totalActiveMs,
      totalGrossChars: this.totalGrossChars,
      totalCorrectChars: this.totalCorrectChars,
      totalErrors: this.totalErrors,
      totalLatencyMs: this.totalLatencyMs,
      totalLatencySamples: this.totalLatencySamples,
      keys: new Set(this.keys),
    };
  }
}
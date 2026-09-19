import { SessionId } from '../value-objects/SessionId.js';
import { adaptiveParams } from '../config/adaptiveParams.js';

export interface PracticePacingStateProps {
  userId: SessionId;
  accumulatedActiveMs?: number;
  lastSessionEndedAt?: Date | null;
}

interface PracticePacingInternalProps {
  userId: SessionId;
  accumulatedActiveMs: number;
  lastSessionEndedAt: Date | null;
}

// RN33 - pacing de prática: bloco de 15 min de prática ativa → pausa mínima de 3 min.
// Relógio sempre injetado nos métodos (testável sem espera real).
export class PracticePacingState {
  readonly userId: SessionId;
  readonly accumulatedActiveMs: number;
  readonly lastSessionEndedAt: Date | null;

  private constructor(props: PracticePacingInternalProps) {
    this.userId = props.userId;
    this.accumulatedActiveMs = props.accumulatedActiveMs;
    this.lastSessionEndedAt = props.lastSessionEndedAt;
  }

  static create(props: PracticePacingStateProps): PracticePacingState {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    const accumulatedActiveMs = props.accumulatedActiveMs ?? 0;
    if (accumulatedActiveMs < 0) {
      throw new Error('Prática ativa acumulada não pode ser negativa');
    }

    return new PracticePacingState({
      userId: props.userId,
      accumulatedActiveMs,
      lastSessionEndedAt: props.lastSessionEndedAt ?? null,
    });
  }

  // RN33 - sessão concluída acumula prática ativa; ABANDONED não passa por aqui (RN13)
  recordCompletedSession(activeDurationMs: number, now: Date): PracticePacingState {
    if (activeDurationMs < 0) {
      throw new Error('Duração de prática não pode ser negativa');
    }

    return new PracticePacingState({
      userId: this.userId,
      accumulatedActiveMs: this.accumulatedActiveMs + activeDurationMs,
      lastSessionEndedAt: now,
    });
  }

  // RN33 - pausa obrigatória quando o bloco estourou e a pausa de 3 min não completou.
  // A lição em curso nunca é interrompida: a política só avalia a criação da próxima sessão.
  isBreakRequired(now: Date): boolean {
    if (this.accumulatedActiveMs < adaptiveParams.PRACTICE_BLOCK_DURATION_MS) {
      return false;
    }
    if (this.lastSessionEndedAt === null) {
      // Sem referência de fim de sessão, não há como exigir pausa (defensivo)
      return false;
    }
    return now.getTime() - this.lastSessionEndedAt.getTime() < adaptiveParams.MIN_BREAK_DURATION_MS;
  }

  // RN33 - quanto falta da pausa (0 quando não há pausa obrigatória)
  breakRemainingMs(now: Date): number {
    if (!this.isBreakRequired(now)) {
      return 0;
    }
    const elapsed = now.getTime() - (this.lastSessionEndedAt?.getTime() ?? now.getTime());
    return Math.max(0, adaptiveParams.MIN_BREAK_DURATION_MS - elapsed);
  }

  // RN33 - bloco estourado e pausa cumprida → próxima sessão inicia um novo bloco
  isNewBlockEligible(now: Date): boolean {
    return (
      this.accumulatedActiveMs >= adaptiveParams.PRACTICE_BLOCK_DURATION_MS &&
      !this.isBreakRequired(now)
    );
  }

  // RN33 - reinicia a sequência 15:3 (acumulador zerado no início do novo bloco)
  startNewBlock(now: Date): PracticePacingState {
    if (!this.isNewBlockEligible(now)) {
      throw new Error('Novo bloco de prática só inicia após a pausa de 3 minutos');
    }
    return new PracticePacingState({
      userId: this.userId,
      accumulatedActiveMs: 0,
      lastSessionEndedAt: now,
    });
  }
}
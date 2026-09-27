import { SessionId } from "../value-objects/SessionId.js";
import { adaptiveParams } from "../config/adaptiveParams.js";

/**
 * Parâmetros efetivos de pacing (admin settings > adaptiveParams defaults).
 * Igual a `ResolvedAdminSettingsProps` mas no contexto de pacing.
 * Vem de `AdminSettings.getEffectiveParams()` no caso de uso.
 */
export interface PacingParams {
  macroBreakEnabled: boolean;
  macroLessonsThreshold: number;
  macroBreakDurationMs: number;
  practiceBlockDurationMs: number;
  minBreakDurationMs: number;
}

/**
 * Converte `adaptiveParams` (defaults de produto) para `PacingParams`.
 * Útil quando não há admin settings persistidas.
 */
export function toPacingParams(params = adaptiveParams): PacingParams {
  return {
    macroBreakEnabled: params.MACRO_BREAK_ENABLED,
    macroLessonsThreshold: params.MACRO_LESSONS_THRESHOLD,
    macroBreakDurationMs: params.MACRO_BREAK_DURATION_MS,
    practiceBlockDurationMs: params.PRACTICE_BLOCK_DURATION_MS,
    minBreakDurationMs: params.MIN_BREAK_DURATION_MS,
  };
}

export interface PracticePacingStateProps {
  userId: SessionId;
  accumulatedActiveMs?: number;
  lastSessionEndedAt?: Date | null;
  completedLessonsSinceMacroBreak?: number;
  macroBreakEndsAt?: Date | null;
}

interface PracticePacingInternalProps {
  userId: SessionId;
  accumulatedActiveMs: number;
  lastSessionEndedAt: Date | null;
  completedLessonsSinceMacroBreak: number;
  macroBreakEndsAt: Date | null;
}

// RN33 - pacing de prática: bloco de 15 min de prática ativa → pausa mínima de 3 min.
// RN34 - macro-pausa: após N lições completadas → pausa longa (padrão 3 aulas → 3h).
// Relógio sempre injetado nos métodos (testável sem espera real).
export class PracticePacingState {
  readonly userId: SessionId;
  readonly accumulatedActiveMs: number;
  readonly lastSessionEndedAt: Date | null;
  readonly completedLessonsSinceMacroBreak: number;
  readonly macroBreakEndsAt: Date | null;

  private constructor(props: PracticePacingInternalProps) {
    this.userId = props.userId;
    this.accumulatedActiveMs = props.accumulatedActiveMs;
    this.lastSessionEndedAt = props.lastSessionEndedAt;
    this.completedLessonsSinceMacroBreak =
      props.completedLessonsSinceMacroBreak;
    this.macroBreakEndsAt = props.macroBreakEndsAt;
  }

  static create(props: PracticePacingStateProps): PracticePacingState {
    if (!(props.userId instanceof SessionId)) {
      throw new Error("userId inválido");
    }

    const accumulatedActiveMs = props.accumulatedActiveMs ?? 0;
    if (accumulatedActiveMs < 0) {
      throw new Error("Prática ativa acumulada não pode ser negativa");
    }

    const completedLessonsSinceMacroBreak =
      props.completedLessonsSinceMacroBreak ?? 0;
    if (completedLessonsSinceMacroBreak < 0) {
      throw new Error(
        "Lições completadas desde macro-pausa não pode ser negativa",
      );
    }

    return new PracticePacingState({
      userId: props.userId,
      accumulatedActiveMs,
      lastSessionEndedAt: props.lastSessionEndedAt ?? null,
      completedLessonsSinceMacroBreak,
      macroBreakEndsAt: props.macroBreakEndsAt ?? null,
    });
  }

  // RN33 - sessão concluída acumula prática ativa; ABANDONED não passa por aqui (RN13)
  recordCompletedSession(
    activeDurationMs: number,
    now: Date,
    _params: PacingParams = toPacingParams(),
  ): PracticePacingState {
    if (activeDurationMs < 0) {
      throw new Error("Duração de prática não pode ser negativa");
    }

    return new PracticePacingState({
      userId: this.userId,
      accumulatedActiveMs: this.accumulatedActiveMs + activeDurationMs,
      lastSessionEndedAt: now,
      completedLessonsSinceMacroBreak: this.completedLessonsSinceMacroBreak,
      macroBreakEndsAt: this.macroBreakEndsAt,
    });
  }

  // RN33 - pausa obrigatória quando o bloco estourou e a pausa de 3 min não completou.
  // A lição em curso nunca é interrompida: a política só avalia a criação da próxima sessão.
  isBreakRequired(now: Date, params: PacingParams = toPacingParams()): boolean {
    if (this.accumulatedActiveMs < params.practiceBlockDurationMs) {
      return false;
    }
    if (this.lastSessionEndedAt === null) {
      // Sem referência de fim de sessão, não há como exigir pausa (defensivo)
      return false;
    }
    return (
      now.getTime() - this.lastSessionEndedAt.getTime() <
      params.minBreakDurationMs
    );
  }

  // RN33 - quanto falta da pausa (0 quando não há pausa obrigatória)
  breakRemainingMs(now: Date, params: PacingParams = toPacingParams()): number {
    if (!this.isBreakRequired(now, params)) {
      return 0;
    }
    const elapsed =
      now.getTime() - (this.lastSessionEndedAt?.getTime() ?? now.getTime());
    return Math.max(0, params.minBreakDurationMs - elapsed);
  }

  // RN33 - bloco estourado e pausa cumprida → próxima sessão inicia um novo bloco
  isNewBlockEligible(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): boolean {
    return (
      this.accumulatedActiveMs >= params.practiceBlockDurationMs &&
      !this.isBreakRequired(now, params)
    );
  }

  // RN33 - reinicia a sequência 15:3 (acumulador zerado no início do novo bloco)
  startNewBlock(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): PracticePacingState {
    if (!this.isNewBlockEligible(now, params)) {
      throw new Error(
        "Novo bloco de prática só inicia após a pausa de 3 minutos",
      );
    }
    return new PracticePacingState({
      userId: this.userId,
      accumulatedActiveMs: 0,
      lastSessionEndedAt: now,
      completedLessonsSinceMacroBreak: this.completedLessonsSinceMacroBreak,
      macroBreakEndsAt: this.macroBreakEndsAt,
    });
  }

  // RN34 - registrar lição completada (incrementa contador para macro-pausa)
  recordLessonCompleted(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): PracticePacingState {
    if (!params.macroBreakEnabled) {
      return this;
    }

    const newCount = this.completedLessonsSinceMacroBreak + 1;
    const macroBreakEndsAt =
      newCount >= params.macroLessonsThreshold
        ? new Date(now.getTime() + params.macroBreakDurationMs)
        : null;

    return new PracticePacingState({
      userId: this.userId,
      accumulatedActiveMs: this.accumulatedActiveMs,
      lastSessionEndedAt: this.lastSessionEndedAt,
      completedLessonsSinceMacroBreak: newCount,
      macroBreakEndsAt,
    });
  }

  // RN34 - verifica se macro-pausa está ativa
  isMacroBreakRequired(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): boolean {
    if (!params.macroBreakEnabled) {
      return false;
    }
    if (this.macroBreakEndsAt === null) {
      return false;
    }
    return now.getTime() < this.macroBreakEndsAt.getTime();
  }

  // RN34 - tempo restante da macro-pausa (0 quando não há pausa obrigatória)
  macroBreakRemainingMs(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): number {
    if (!this.isMacroBreakRequired(now, params)) {
      return 0;
    }
    // isMacroBreakRequired garante que macroBreakEndsAt não é null
    const endsAt = this.macroBreakEndsAt as Date;
    return Math.max(0, endsAt.getTime() - now.getTime());
  }

  // RN34 - reinicia ciclo macro (após pausa cumprida)
  startNewMacroCycle(
    now: Date,
    params: PacingParams = toPacingParams(),
  ): PracticePacingState {
    if (
      !this.isMacroBreakRequired(now, params) &&
      this.macroBreakEndsAt !== null
    ) {
      // Já pode iniciar novo ciclo
      return new PracticePacingState({
        userId: this.userId,
        accumulatedActiveMs: this.accumulatedActiveMs,
        lastSessionEndedAt: this.lastSessionEndedAt,
        completedLessonsSinceMacroBreak: 0,
        macroBreakEndsAt: null,
      });
    }
    throw new Error("Novo ciclo macro só inicia após a macro-pausa completar");
  }
}

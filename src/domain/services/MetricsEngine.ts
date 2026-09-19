import type { TypingSession } from '../entities/TypingSession.js';
import { SessionMetrics } from '../entities/SessionMetrics.js';
import { adaptiveParams } from '../config/adaptiveParams.js';
import type { KeystrokeEvent } from '../entities/KeystrokeEvent.js';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MetricsEngine {
  static calculate(session: TypingSession): SessionMetrics {
    const keystrokes = session.keystrokes;

    if (keystrokes.length === 0) {
      return SessionMetrics.insufficientData();
    }

    const activeDurationMs = session.activeDurationMs;

    const { charactersTyped, correctCharacters, incorrectCharacters, correctedErrors, validLatencies } =
      MetricsEngine.processKeystrokes(keystrokes);

    const finalUncorrectedErrors = Math.max(0, incorrectCharacters - correctedErrors);

    const accuracy = charactersTyped > 0 ? correctCharacters / charactersTyped : 0;

    const activeDurationMinutes = MetricsEngine.getActiveDurationMinutes(activeDurationMs);

    const isInsufficient =
      activeDurationMs < adaptiveParams.INSUFFICIENT_DATA_MIN_DURATION_MS ||
      charactersTyped < adaptiveParams.INSUFFICIENT_DATA_MIN_CHARS;

    let grossWpm = 0;
    let netWpm = 0;

    if (!isInsufficient) {
      grossWpm = MetricsEngine.calculateGrossWpm(charactersTyped, activeDurationMinutes);
      netWpm = MetricsEngine.calculateNetWpm(grossWpm, finalUncorrectedErrors, activeDurationMinutes);
    }

    const averageLatencyMs = validLatencies.length > 0
      ? validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length
      : 0;

    return SessionMetrics.create({
      charactersTyped,
      correctCharacters,
      incorrectCharacters,
      correctedErrors,
      finalUncorrectedErrors,
      accuracy,
      grossWpm,
      netWpm,
      activeDurationMs,
      averageLatencyMs,
    });
  }

  private static processKeystrokes(keystrokes: readonly KeystrokeEvent[]): {
    charactersTyped: number;
    correctCharacters: number;
    incorrectCharacters: number;
    correctedErrors: number;
    validLatencies: number[];
  } {
    let charactersTyped = 0;
    let correctCharacters = 0;
    let incorrectCharacters = 0;
    let correctedErrors = 0;
    const validLatencies: number[] = [];

    for (const ks of keystrokes) {
      if (ks.eventType === 'CORRECTION') {
        correctedErrors++;
        continue;
      }
      if (ks.eventType === 'DEAD_KEY_COMPOSE') {
        if (ks.latencyMs !== null) {
          validLatencies.push(ks.latencyMs);
        }
        continue;
      }
      if (ks.isControlKey()) {
        continue;
      }

      switch (ks.eventType) {
        case 'CORRECT':
          charactersTyped++;
          correctCharacters++;
          if (ks.latencyMs !== null) {
            validLatencies.push(ks.latencyMs);
          }
          break;
        case 'INCORRECT':
          charactersTyped++;
          incorrectCharacters++;
          if (ks.latencyMs !== null) {
            validLatencies.push(ks.latencyMs);
          }
          break;
      }
    }

    return { charactersTyped, correctCharacters, incorrectCharacters, correctedErrors, validLatencies };
  }

  private static getActiveDurationMinutes(activeDurationMs: number): number {
    const epsilon = adaptiveParams.ACTIVE_DURATION_EPSILON_MS;
    const effectiveDurationMs = Math.max(activeDurationMs, epsilon);
    return effectiveDurationMs / 60000;
  }

  private static calculateGrossWpm(charactersTyped: number, activeDurationMinutes: number): number {
    if (activeDurationMinutes <= 0) return 0;
    return Math.round((charactersTyped / 5) / activeDurationMinutes);
  }

  private static calculateNetWpm(grossWpm: number, finalUncorrectedErrors: number, activeDurationMinutes: number): number {
    if (activeDurationMinutes <= 0) return 0;
    const errorPenalty = finalUncorrectedErrors / activeDurationMinutes;
    return Math.max(0, Math.round(grossWpm - errorPenalty));
  }
}
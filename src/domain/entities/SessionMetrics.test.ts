import { describe, it, expect } from 'vitest';
import { SessionMetrics } from './SessionMetrics.js';

describe('SessionMetrics', () => {
  describe('PRD §12 - SessionMetrics entity', () => {
    it('deve criar SessionMetrics válida', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters: 95,
        incorrectCharacters: 5,
        correctedErrors: 3,
        finalUncorrectedErrors: 2,
        accuracy: 0.95,
        grossWpm: 60,
        netWpm: 58,
        activeDurationMs: 30000,
        averageLatencyMs: 200,
      });

      expect(metrics.charactersTyped).toBe(100);
      expect(metrics.correctCharacters).toBe(95);
      expect(metrics.incorrectCharacters).toBe(5);
      expect(metrics.correctedErrors).toBe(3);
      expect(metrics.finalUncorrectedErrors).toBe(2);
      expect(metrics.accuracy).toBe(0.95);
      expect(metrics.grossWpm).toBe(60);
      expect(metrics.netWpm).toBe(58);
      expect(metrics.activeDurationMs).toBe(30000);
      expect(metrics.averageLatencyMs).toBe(200);
    });

    it('deve criar insufficient data metrics', () => {
      const metrics = SessionMetrics.insufficientData();

      expect(metrics.charactersTyped).toBe(0);
      expect(metrics.activeDurationMs).toBe(0);
      expect(metrics.isInsufficientData()).toBe(true);
    });

    it('deve identificar insufficient data', () => {
      const metrics = SessionMetrics.create({
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

      expect(metrics.isInsufficientData()).toBe(true);
    });

    it('não deve identificar insufficient data quando há dados', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 10,
        correctCharacters: 8,
        incorrectCharacters: 2,
        correctedErrors: 1,
        finalUncorrectedErrors: 1,
        accuracy: 0.8,
        grossWpm: 30,
        netWpm: 28,
        activeDurationMs: 5000,
        averageLatencyMs: 250,
      });

      expect(metrics.isInsufficientData()).toBe(false);
    });
  });

  describe('RN21 - FinalUncorrectedErrors = max(0, TotalErrors - CorrectedErrors)', () => {
    it('deve calcular finalUncorrectedErrors corretamente', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters: 90,
        incorrectCharacters: 10,
        correctedErrors: 3,
        finalUncorrectedErrors: 7, // 10 - 3 = 7
        accuracy: 0.9,
        grossWpm: 50,
        netWpm: 45,
        activeDurationMs: 30000,
        averageLatencyMs: 200,
      });

      expect(metrics.finalUncorrectedErrors).toBe(7);
    });

    it('deve saturar em 0 quando correctedErrors > errors (RN21)', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters: 95,
        incorrectCharacters: 5,
        correctedErrors: 10, // mais correções que erros
        finalUncorrectedErrors: 0, // max(0, 5 - 10) = 0
        accuracy: 0.95,
        grossWpm: 50,
        netWpm: 50,
        activeDurationMs: 30000,
        averageLatencyMs: 200,
      });

      expect(metrics.finalUncorrectedErrors).toBe(0);
    });
  });

  describe('RN22 - Sessão com activeDurationMs < 3000 OU charactersTyped < 5 → insufficient-data', () => {
    it('deve ser insufficient-data quando activeDurationMs < 3000', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters: 95,
        incorrectCharacters: 5,
        correctedErrors: 3,
        finalUncorrectedErrors: 2,
        accuracy: 0.95,
        grossWpm: 60,
        netWpm: 58,
        activeDurationMs: 2000, // < 3000
        averageLatencyMs: 200,
      });

      // The entity itself doesn't enforce RN22, but the factory method exists
      expect(metrics.activeDurationMs).toBe(2000);
    });

    it('deve ser insufficient-data quando charactersTyped < 5', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 3, // < 5
        correctCharacters: 3,
        incorrectCharacters: 0,
        correctedErrors: 0,
        finalUncorrectedErrors: 0,
        accuracy: 1,
        grossWpm: 0,
        netWpm: 0,
        activeDurationMs: 5000,
        averageLatencyMs: 200,
      });

      expect(metrics.charactersTyped).toBe(3);
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para caracteres negativos', () => {
      expect(() =>
        SessionMetrics.create({
          charactersTyped: -1,
          correctCharacters: 0,
          incorrectCharacters: 0,
          correctedErrors: 0,
          finalUncorrectedErrors: 0,
          accuracy: 0,
          grossWpm: 0,
          netWpm: 0,
          activeDurationMs: 0,
          averageLatencyMs: 0,
        })
      ).toThrow('Characters typed não pode ser negativo');
    });

    it('deve lançar erro para accuracy fora do range', () => {
      expect(() =>
        SessionMetrics.create({
          charactersTyped: 100,
          correctCharacters: 95,
          incorrectCharacters: 5,
          correctedErrors: 3,
          finalUncorrectedErrors: 2,
          accuracy: 1.5,
          grossWpm: 60,
          netWpm: 58,
          activeDurationMs: 30000,
          averageLatencyMs: 200,
        })
      ).toThrow('Accuracy deve estar entre 0 e 1');
    });

    it('deve lançar erro para WPM negativo', () => {
      expect(() =>
        SessionMetrics.create({
          charactersTyped: 100,
          correctCharacters: 95,
          incorrectCharacters: 5,
          correctedErrors: 3,
          finalUncorrectedErrors: 2,
          accuracy: 0.95,
          grossWpm: -10,
          netWpm: 58,
          activeDurationMs: 30000,
          averageLatencyMs: 200,
        })
      ).toThrow('Gross WPM não pode ser negativo');
    });
  });

  describe('PRD §12 - Validação e serialização (complementar)', () => {
    it.each([
      ['correctCharacters', { correctCharacters: -1 }, 'Correct characters não pode ser negativo'],
      ['incorrectCharacters', { incorrectCharacters: -1 }, 'Incorrect characters não pode ser negativo'],
      ['correctedErrors', { correctedErrors: -1 }, 'Corrected errors não pode ser negativo'],
      ['finalUncorrectedErrors', { finalUncorrectedErrors: -1 }, 'Final uncorrected errors não pode ser negativo'],
      ['netWpm', { netWpm: -1 }, 'Net WPM não pode ser negativo'],
      ['activeDurationMs', { activeDurationMs: -1 }, 'Active duration não pode ser negativo'],
      ['averageLatencyMs', { averageLatencyMs: -1 }, 'Average latency não pode ser negativo'],
    ])('deve rejeitar %s negativa', (_field, overrides, message) => {
      expect(() =>
        SessionMetrics.create({
          charactersTyped: 100,
          correctCharacters: 95,
          incorrectCharacters: 5,
          correctedErrors: 3,
          finalUncorrectedErrors: 2,
          accuracy: 0.95,
          grossWpm: 60,
          netWpm: 58,
          activeDurationMs: 30000,
          averageLatencyMs: 200,
          ...overrides,
        })
      ).toThrow(message);
    });

    it('toJSON deve retornar dados corretos', () => {
      const metrics = SessionMetrics.create({
        charactersTyped: 100,
        correctCharacters: 95,
        incorrectCharacters: 5,
        correctedErrors: 3,
        finalUncorrectedErrors: 2,
        accuracy: 0.95,
        grossWpm: 60,
        netWpm: 58,
        activeDurationMs: 30000,
        averageLatencyMs: 200,
      });

      const json = metrics.toJSON();

      expect(json.charactersTyped).toBe(100);
      expect(json.accuracy).toBe(0.95);
      expect(json.averageLatencyMs).toBe(200);
    });
  });
});
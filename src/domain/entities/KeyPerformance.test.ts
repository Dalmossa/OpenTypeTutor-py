import { describe, it, expect } from 'vitest';
import { KeyPerformance } from './KeyPerformance.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';

describe('KeyPerformance', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLayout = Layout.create('ABNT2');

  describe('RN11 - KeyPerformance isolado por userId+logicalKey+layout', () => {
    it('deve criar KeyPerformance com campos obrigatórios', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.userId).toBe(validUserId);
      expect(kp.logicalKey).toBe('a');
      expect(kp.layout).toBe(validLayout);
      expect(kp.attempts).toBe(0);
      expect(kp.errors).toBe(0);
      expect(kp.averageLatencyMs).toBe(0);
      expect(kp.lastPracticedAt).toBeNull();
      expect(kp.consecutiveMasterySessions).toBe(0);
      expect(kp.regressionSessions).toBe(0);
      expect(kp.masteryState).toBe('UNKNOWN');
    });

    it('deve gerar ID automaticamente', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.id).toBeDefined();
    });

    it('chaves iguais (mesmo userId, logicalKey, layout) devem ser iguais', () => {
      const kp1 = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      const kp2 = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });

      expect(kp1.equals(kp2)).toBe(true);
    });

    it('layouts diferentes devem ser chaves diferentes (RN11)', () => {
      const usLayout = Layout.create('US-INTERNATIONAL');
      const kp1 = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      const kp2 = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: usLayout });

      expect(kp1.equals(kp2)).toBe(false);
    });

    it('usuários diferentes devem ser chaves diferentes', () => {
      const otherUserId = SessionId.create();
      const kp1 = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      const kp2 = KeyPerformance.create({ userId: otherUserId, logicalKey: 'a', layout: validLayout });

      expect(kp1.equals(kp2)).toBe(false);
    });
  });

  describe('RN05 - ErrorRate = errors / attempts (0 quando attempts = 0)', () => {
    it('deve retornar 0 quando attempts = 0', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.errorRate).toBe(0);
    });

    it('deve calcular errorRate corretamente', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpWithAttempts = kp.recordAttempt({ isError: false, latencyMs: 100 });
      const kpWithError = kpWithAttempts.recordAttempt({ isError: true, latencyMs: 200 });
      const kpWithError2 = kpWithError.recordAttempt({ isError: true, latencyMs: 150 });

      // 2 errors / 3 attempts = 0.666...
      expect(kpWithError2.errorRate).toBeCloseTo(2 / 3, 5);
    });
  });

  describe('RN20 - KeyAccuracy = 1 - ErrorRate', () => {
    it('deve retornar 1 quando attempts = 0', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.keyAccuracy).toBe(1);
    });

    it('deve calcular keyAccuracy corretamente', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpWithAttempts = kp.recordAttempt({ isError: false, latencyMs: 100 });
      const kpWithError = kpWithAttempts.recordAttempt({ isError: true, latencyMs: 200 });

      // 1 error / 2 attempts = 0.5 errorRate, keyAccuracy = 0.5
      expect(kpWithError.keyAccuracy).toBe(0.5);
    });
  });

  describe('RN06 - LatencyScore = min(1, AverageLatencyMs / 500)', () => {
    it('deve retornar 0 quando averageLatencyMs = 0', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.latencyScore).toBe(0);
    });

    it('deve calcular latencyScore corretamente', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpWithLatency = kp.recordAttempt({ isError: false, latencyMs: 250 });

      // 250 / 500 = 0.5
      expect(kpWithLatency.latencyScore).toBe(0.5);
    });

    it('deve limitar em 1 quando latency > 500', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpWithHighLatency = kp.recordAttempt({ isError: false, latencyMs: 1000 });

      expect(kpWithHighLatency.latencyScore).toBe(1);
    });
  });

  describe('RN07 - RecencyScore = 1 - e^(-0.1 * t) onde t = dias desde última prática', () => {
    it('deve retornar 1 quando nunca praticado', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      expect(kp.recencyScore).toBe(1);
    });

    it('deve calcular recencyScore corretamente', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // Simulate last practiced 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const props = kp.toProps();
      const kpWithRecency = KeyPerformance.reconstruct({
        ...props,
        lastPracticedAt: tenDaysAgo,
        attempts: 10,
        errors: 1,
        averageLatencyMs: 200,
      });

      const expected = 1 - Math.exp(-0.1 * 10);
      expect(kpWithRecency.recencyScore).toBeCloseTo(expected, 5);
    });
  });

  describe('RN04 - WeakKeyScore = 0.50 * ErrorRate + 0.30 * LatencyScore + 0.20 * RecencyScore', () => {
    it('deve calcular weakKeyScore com pesos corretos (sem prática prévia)', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // Fresh entity: lastPracticedAt = null -> recencyScore = 1
      // No attempts yet: errorRate = 0, latencyScore = 0
      expect(kp.weakKeyScore).toBeCloseTo(0.20, 2); // 0.5*0 + 0.3*0 + 0.2*1 = 0.20
    });

    it('deve calcular weakKeyScore após tentativa', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // After attempt: errorRate = 1, latencyScore = 400/500 = 0.8, recencyScore = 0 (just practiced)
      const kpWithData = kp.recordAttempt({ isError: true, latencyMs: 400 });

      // WeakKeyScore = 0.5*1 + 0.3*0.8 + 0.2*0 = 0.50 + 0.24 + 0 = 0.74
      expect(kpWithData.weakKeyScore).toBeCloseTo(0.74, 2);
    });
  });

  describe('RN08 - UNKNOWN (attempts < 5)', () => {
    it('deve ser UNKNOWN quando attempts < 5', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpWith3Attempts = kp
        .recordAttempt({ isError: false, latencyMs: 100 })
        .recordAttempt({ isError: false, latencyMs: 100 })
        .recordAttempt({ isError: false, latencyMs: 100 });

      expect(kpWith3Attempts.masteryState).toBe('UNKNOWN');
    });

    it('não deve ser UNKNOWN quando attempts >= 5', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      let kpWithAttempts = kp;
      for (let i = 0; i < 5; i++) {
        kpWithAttempts = kpWithAttempts.recordAttempt({ isError: false, latencyMs: 100 });
      }

      expect(kpWithAttempts.masteryState).not.toBe('UNKNOWN');
    });
  });

  describe('RN09 - Mastery (KeyAccuracy >= 95% E attempts >= 30 E avgLatency <= 500ms) em 3 sessões consecutivas', () => {
    it('deve transicionar para MASTERED após 3 sessões mastery-approved consecutivas', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // Build up to 30 attempts with good stats
      for (let i = 0; i < 30; i++) {
        kp = kp.recordAttempt({ isError: false, latencyMs: 200 });
      }

      // Now simulate 3 mastery-approved sessions
      kp = kp.recordSessionEnd(true); // 1st approved
      expect(kp.consecutiveMasterySessions).toBe(1);

      kp = kp.recordSessionEnd(true); // 2nd approved
      expect(kp.consecutiveMasterySessions).toBe(2);

      kp = kp.recordSessionEnd(true); // 3rd approved -> MASTERED
      expect(kp.masteryState).toBe('MASTERED');
      expect(kp.consecutiveMasterySessions).toBe(0); // reset after MASTERED
    });
  });

  describe('RN10 - Regressão de MASTERED (3 sessões não aprovadas consecutivas)', () => {
    it('deve regredir de MASTERED após 3 sessões não aprovadas', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // Build up to mastery
      for (let i = 0; i < 30; i++) {
        kp = kp.recordAttempt({ isError: false, latencyMs: 200 });
      }
      kp = kp.recordSessionEnd(true);
      kp = kp.recordSessionEnd(true);
      kp = kp.recordSessionEnd(true); // MASTERED

      expect(kp.masteryState).toBe('MASTERED');

      // 3 non-approved sessions
      kp = kp.recordSessionEnd(false); // 1st regression
      expect(kp.regressionSessions).toBe(1);

      kp = kp.recordSessionEnd(false); // 2nd regression
      expect(kp.regressionSessions).toBe(2);

      kp = kp.recordSessionEnd(false); // 3rd regression -> should regress
      expect(kp.masteryState).not.toBe('MASTERED');
      expect(kp.regressionSessions).toBe(0); // reset after regression
    });
  });

  describe('Contadores - nunca incrementam juntos (RN09/RN10 semântica)', () => {
    it('consecutiveMasterySessions só incrementa antes de MASTERED', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      for (let i = 0; i < 30; i++) {
        kp = kp.recordAttempt({ isError: false, latencyMs: 200 });
      }

      kp = kp.recordSessionEnd(true); // 1
      expect(kp.consecutiveMasterySessions).toBe(1);
      expect(kp.regressionSessions).toBe(0);

      kp = kp.recordSessionEnd(true); // 2
      expect(kp.consecutiveMasterySessions).toBe(2);

      kp = kp.recordSessionEnd(true); // MASTERED
      expect(kp.masteryState).toBe('MASTERED');
      expect(kp.consecutiveMasterySessions).toBe(0); // reset

      // After MASTERED, regressionSessions should be used
      kp = kp.recordSessionEnd(false);
      expect(kp.regressionSessions).toBe(1);
      expect(kp.consecutiveMasterySessions).toBe(0);
    });

    it('regressionSessions só incrementa depois de MASTERED', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      for (let i = 0; i < 30; i++) {
        kp = kp.recordAttempt({ isError: false, latencyMs: 200 });
      }
      kp = kp.recordSessionEnd(true);
      kp = kp.recordSessionEnd(true);
      kp = kp.recordSessionEnd(true); // MASTERED

      // regressionSessions should start counting now
      kp = kp.recordSessionEnd(false);
      expect(kp.regressionSessions).toBe(1);

      // consecutiveMasterySessions should stay 0
      expect(kp.consecutiveMasterySessions).toBe(0);
    });
  });

  describe('Record attempt', () => {
    it('deve incrementar attempts', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpAfter = kp.recordAttempt({ isError: false, latencyMs: 100 });

      expect(kpAfter.attempts).toBe(1);
      expect(kpAfter.errors).toBe(0);
    });

    it('deve incrementar errors quando isError = true', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpAfter = kp.recordAttempt({ isError: true, latencyMs: 100 });

      expect(kpAfter.attempts).toBe(1);
      expect(kpAfter.errors).toBe(1);
    });

    it('deve atualizar averageLatencyMs', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpAfter = kp.recordAttempt({ isError: false, latencyMs: 200 });

      expect(kpAfter.averageLatencyMs).toBe(200);
    });

    it('deve atualizar lastPracticedAt', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const kpAfter = kp.recordAttempt({ isError: false, latencyMs: 100 });

      expect(kpAfter.lastPracticedAt).toBeInstanceOf(Date);
    });
  });

  describe('Classificação por WeakKeyScore (RN04/RN05/RN06/RN07)', () => {
    it('WEAK quando WeakKeyScore >= 0.70', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // Need 5+ attempts to get past UNKNOWN
      // High error rate (all errors), high latency (500ms = latencyScore 1.0)
      // After 5 attempts: errorRate = 1, latencyScore = 1, recencyScore = 0 (just practiced)
      // WeakKeyScore = 0.5*1 + 0.3*1 + 0.2*0 = 0.80 >= 0.70
      for (let i = 0; i < 5; i++) {
        kp = kp.recordAttempt({ isError: true, latencyMs: 500 });
      }

      expect(kp.masteryState).toBe('WEAK');
    });

    it('CONSOLIDATING quando 0.40 <= WeakKeyScore < 0.70', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // 5 attempts: 2 errors, 3 correct, latency 150ms
      // errorRate = 2/5 = 0.4, latencyScore = 150/500 = 0.3, recencyScore = 0
      // WeakKeyScore = 0.5*0.4 + 0.3*0.3 + 0.2*0 = 0.20 + 0.09 = 0.29 < 0.40 -> LEARNING
      // Let's adjust: need higher weakKeyScore
      // Try: 3 errors out of 5, latency 300ms
      // errorRate = 3/5 = 0.6, latencyScore = 300/500 = 0.6, recencyScore = 0
      // WeakKeyScore = 0.5*0.6 + 0.3*0.6 + 0.2*0 = 0.30 + 0.18 = 0.48 -> CONSOLIDATING
      kp = kp.recordAttempt({ isError: true, latencyMs: 300 });
      kp = kp.recordAttempt({ isError: true, latencyMs: 300 });
      kp = kp.recordAttempt({ isError: true, latencyMs: 300 });
      kp = kp.recordAttempt({ isError: false, latencyMs: 300 });
      kp = kp.recordAttempt({ isError: false, latencyMs: 300 });

      expect(kp.masteryState).toBe('CONSOLIDATING');
    });

    it('LEARNING quando WeakKeyScore < 0.40', () => {
      let kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      // 5 attempts: all correct, low latency (50ms = latencyScore 0.1)
      // errorRate = 0, latencyScore = 0.1, recencyScore = 0
      // WeakKeyScore = 0.5*0 + 0.3*0.1 + 0.2*0 = 0.03 < 0.40
      for (let i = 0; i < 5; i++) {
        kp = kp.recordAttempt({ isError: false, latencyMs: 50 });
      }

      expect(kp.masteryState).toBe('LEARNING');
    });
  });

  describe('Serialização', () => {
    it('toDTO deve retornar dados corretos', () => {
      const kp = KeyPerformance.create({
        userId: validUserId,
        logicalKey: 'a',
        layout: validLayout,
      });

      const dto = kp.toDTO();

      expect(dto.userId).toBe(validUserId.value);
      expect(dto.logicalKey).toBe('a');
      expect(dto.layout).toBe('ABNT2');
      expect(dto.attempts).toBe(0);
      expect(dto.errors).toBe(0);
      expect(dto.masteryState).toBe('UNKNOWN');
    });
  });

  describe('PRD §16 - Validação, regressão/progressão e serialização (complementar)', () => {
    it('deve rejeitar userId inválido', () => {
      expect(() =>
        KeyPerformance.create({
          userId: 'invalid' as unknown as SessionId,
          logicalKey: 'a',
          layout: validLayout,
        })
      ).toThrow('userId inválido');
    });

    it('deve rejeitar layout inválido', () => {
      expect(() =>
        KeyPerformance.create({
          userId: validUserId,
          logicalKey: 'a',
          layout: 'invalid' as unknown as Layout,
        })
      ).toThrow('Layout inválido');
    });

    it('deve rejeitar logicalKey vazia', () => {
      expect(() =>
        KeyPerformance.create({
          userId: validUserId,
          logicalKey: '',
          layout: validLayout,
        })
      ).toThrow('logicalKey é obrigatório');
    });

    it('deve manter MASTERED após novo attempt (RN09)', () => {
      let kp = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      kp = KeyPerformance.reconstruct({ ...kp.toProps(), masteryState: 'MASTERED', attempts: 10 });

      const after = kp.recordAttempt({ isError: false, latencyMs: 100 });

      expect(after.masteryState).toBe('MASTERED');
    });

    it('deve promover a MASTERED quando critérios atingidos (RN09)', () => {
      let kp = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      kp = KeyPerformance.reconstruct({
        ...kp.toProps(),
        masteryState: 'CONSOLIDATING',
        attempts: 30,
        consecutiveMasterySessions: 3,
      });

      const after = kp.recordAttempt({ isError: false, latencyMs: 100 });

      expect(after.masteryState).toBe('MASTERED');
    });

    it('deve zerar regressionSessions quando sessão aprovada em tecla MASTERED (RN10)', () => {
      let kp = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      kp = KeyPerformance.reconstruct({
        ...kp.toProps(),
        masteryState: 'MASTERED',
        attempts: 10,
        consecutiveMasterySessions: 0,
        regressionSessions: 2,
      });

      const after = kp.recordSessionEnd(true);

      expect(after.masteryState).toBe('MASTERED');
      expect(after.regressionSessions).toBe(0);
    });

    it('deve zerar consecutiveMasterySessions em sessão não aprovada (RN10)', () => {
      let kp = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });
      kp = KeyPerformance.reconstruct({
        ...kp.toProps(),
        masteryState: 'CONSOLIDATING',
        attempts: 5,
        consecutiveMasterySessions: 2,
      });

      const after = kp.recordSessionEnd(false);

      expect(after.consecutiveMasterySessions).toBe(0);
    });

    it('toJSON deve delegar para toDTO', () => {
      const kp = KeyPerformance.create({ userId: validUserId, logicalKey: 'a', layout: validLayout });

      const json = kp.toJSON();

      expect(json.userId).toBe(validUserId.value);
      expect(json.logicalKey).toBe('a');
      expect(json.masteryState).toBe('UNKNOWN');
    });
  });
});
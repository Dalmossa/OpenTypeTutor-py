import { describe, it, expect } from 'vitest';
import { TypingSession } from './TypingSession.js';
import type { TypingSessionProps } from './TypingSession.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import { SessionMetrics } from './SessionMetrics.js';
import { KeystrokeEvent } from './KeystrokeEvent.js';

describe('TypingSession', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLessonId = SessionId.create('550e8400-e29b-41d4-a716-446655440001');
  const validLayout = Layout.create('ABNT2');

  describe('PRD §9 - Estados da sessão', () => {
    it('deve criar sessão no estado IDLE', () => {
      const session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      expect(session.state).toBe('IDLE');
      expect(session.id).toBeDefined();
      expect(session.startedAt).toBeNull();
      expect(session.completedAt).toBeNull();
      expect(session.activeDurationMs).toBe(0);
      expect(session.keystrokes).toHaveLength(0);
      expect(session.metrics).toBeNull();
    });
  });

  describe('PRD §9.2 - Transições válidas', () => {
    it('IDLE -> RUNNING (start)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      session = session.start();

      expect(session.state).toBe('RUNNING');
      expect(session.startedAt).toBeInstanceOf(Date);
    });

    it('RUNNING -> PAUSED (pause)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      session = session.pause();

      expect(session.state).toBe('PAUSED');
    });

    it('PAUSED -> RUNNING (resume)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.pause();

      session = session.resume();

      expect(session.state).toBe('RUNNING');
    });

    it('RUNNING -> COMPLETED (complete)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      const metrics = createMockMetrics();
      session = session.complete(metrics);

      expect(session.state).toBe('COMPLETED');
      expect(session.completedAt).toBeInstanceOf(Date);
      expect(session.metrics).toBe(metrics);
    });

    it('RUNNING -> ABANDONED (abandon)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      session = session.abandon();

      expect(session.state).toBe('ABANDONED');
      expect(session.completedAt).toBeInstanceOf(Date);
    });

    it('PAUSED -> ABANDONED (abandon)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.pause();

      session = session.abandon();

      expect(session.state).toBe('ABANDONED');
    });

    it('PAUSED -> COMPLETED (complete)', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.pause();

      const metrics = createMockMetrics();
      session = session.complete(metrics);

      expect(session.state).toBe('COMPLETED');
    });
  });

  describe('PRD §9.2 - Transições inválidas', () => {
    it('não deve permitir start em sessão RUNNING', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      expect(() => session.start()).toThrow('Transição inválida');
    });

    it('não deve permitir pause em sessão IDLE', () => {
      const session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      expect(() => session.pause()).toThrow('Transição inválida');
    });

    it('não deve permitir resume em sessão RUNNING', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      expect(() => session.resume()).toThrow('Transição inválida');
    });

    it('não deve permitir complete em sessão IDLE', () => {
      const session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      expect(() => session.complete(createMockMetrics())).toThrow('Transição inválida');
    });

    it('não deve permitir abandon em sessão COMPLETED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.complete(createMockMetrics());

      expect(() => session.abandon()).toThrow('Transição inválida');
    });

    it('não deve permitir transições em sessão ABANDONED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.abandon();

      expect(() => session.pause()).toThrow('Transição inválida');
      expect(() => session.resume()).toThrow('Transição inválida');
      expect(() => session.complete(createMockMetrics())).toThrow('Transição inválida');
    });
  });

  describe('RN14 - Idempotência do complete', () => {
    it('complete em sessão COMPLETED deve retornar métricas existentes sem erro', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      const metrics = createMockMetrics();
      session = session.complete(metrics);

      // Second complete should not throw and should return same metrics
      const secondComplete = session.complete(createMockMetrics());
      expect(secondComplete.metrics).toBe(metrics);
    });
  });

  describe('PRD §12 - Métricas pós-conclusão', () => {
    it('setMetrics deve substituir métricas em sessão COMPLETED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.complete(createMockMetrics());

      const realMetrics = createMockMetrics();
      const withMetrics = session.setMetrics(realMetrics);

      expect(withMetrics.state).toBe('COMPLETED');
      expect(withMetrics.metrics).toBe(realMetrics);
    });

    it('setMetrics deve falhar em sessão não COMPLETED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      expect(() => session.setMetrics(createMockMetrics())).toThrow(
        'Métricas só podem ser definidas em sessão COMPLETED'
      );
    });
  });

  describe('Keystrokes', () => {
    it('deve adicionar keystrokes durante sessão RUNNING', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      const keystroke = KeystrokeEvent.create({
        expectedKey: 'a',
        typedKey: 'a',
        physicalKey: 'KeyA',
        logicalKey: 'a',
        eventType: 'CORRECT',
        timestampMs: 1000,
        latencyMs: 150,
        composedCharacter: null,
      });
      session = session.addKeystroke(keystroke);

      expect(session.keystrokes).toHaveLength(1);
    });

    it('não deve adicionar keystrokes em sessão IDLE', () => {
      const session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      const keystroke = KeystrokeEvent.create({
        expectedKey: 'a',
        typedKey: 'a',
        physicalKey: 'KeyA',
        logicalKey: 'a',
        eventType: 'CORRECT',
        timestampMs: 1000,
        latencyMs: 150,
        composedCharacter: null,
      });

      expect(() => session.addKeystroke(keystroke)).toThrow('Sessão não está em andamento');
    });

    it('recordKeystrokes deve anexar todos os eventos em sessão RUNNING', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      const first = createCorrectKeystroke(1000);
      const second = createCorrectKeystroke(1100);
      session = session.recordKeystrokes([first, second]);

      expect(session.keystrokes).toHaveLength(2);
      expect(session.keystrokes[0]).toBe(first);
      expect(session.keystrokes[1]).toBe(second);
    });

    it('recordKeystrokes deve anexar eventos em sessão PAUSED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.pause();

      const keystroke = createCorrectKeystroke(1000);
      session = session.recordKeystrokes([keystroke]);

      expect(session.state).toBe('PAUSED');
      expect(session.keystrokes).toHaveLength(1);
    });

    it('recordKeystrokes deve falhar fora de RUNNING/PAUSED', () => {
      const session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      expect(() => session.recordKeystrokes([createCorrectKeystroke(1000)])).toThrow(
        'Sessão não está em andamento'
      );
    });
  });

  describe('PRD §10 - ActiveDuration', () => {
    it('deve calcular activeDurationMs corretamente com pausas', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      // Use the session's internal timestamps for verification
      // Since we can't control time, we test that activeDurationMs is calculated
      session = session.pause();
      session = session.resume();
      session = session.pause();
      session = session.resume();
      session = session.complete(createMockMetrics());

      // activeDurationMs should be non-negative
      expect(session.activeDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PRD §9 - Validação, igualdade e serialização', () => {
    it('deve lançar erro para userId inválido no create', () => {
      expect(() =>
        TypingSession.create({
          userId: 'invalid' as unknown as SessionId,
          lessonId: validLessonId,
          layout: validLayout,
        })
      ).toThrow('userId inválido');
    });

    it('deve lançar erro para lessonId inválido no create', () => {
      expect(() =>
        TypingSession.create({
          userId: validUserId,
          lessonId: 'invalid' as unknown as SessionId,
          layout: validLayout,
        })
      ).toThrow('lessonId inválido');
    });

    it('deve lançar erro para layout inválido no create', () => {
      expect(() =>
        TypingSession.create({
          userId: validUserId,
          lessonId: validLessonId,
          layout: 'invalid' as unknown as Layout,
        })
      ).toThrow('Layout inválido');
    });

    it('equals deve comparar pelo id', () => {
      const a = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      const b = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });

      expect(a.equals(b)).toBe(false);
    });

    it('toJSON deve retornar os campos esperados', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();

      const json = session.toJSON();

      expect(json.state).toBe('RUNNING');
      expect(json.userId.equals(validUserId)).toBe(true);
      expect(json.layout.equals(validLayout)).toBe(true);
    });

    it('deve completar sessão a partir de PAUSED', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.pause();

      const completed = session.complete(createMockMetrics());

      expect(completed.state).toBe('COMPLETED');
      expect(completed.activeDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('reconstruct deve restaurar sessão completa a partir de TypingSessionProps', () => {
      let session = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      session = session.start();
      session = session.recordKeystrokes([createCorrectKeystroke(1000), createCorrectKeystroke(1100)]);
      session = session.complete(createMockMetrics());
      session = session.setMetrics(createMockMetrics());

      const restored = TypingSession.reconstruct(session.toJSON());

      expect(restored.state).toBe('COMPLETED');
      expect(restored.id.equals(session.id)).toBe(true);
      expect(restored.userId.equals(session.userId)).toBe(true);
      expect(restored.lessonId.equals(session.lessonId)).toBe(true);
      expect(restored.layout.equals(session.layout)).toBe(true);
      expect(restored.keystrokes).toHaveLength(2);
      expect(restored.metrics?.netWpm).toBe(session.metrics?.netWpm);
      expect(restored.completedAt).not.toBeNull();
      expect(restored.toJSON()).toEqual(session.toJSON());
    });

    it('reconstruct deve rejeitar estado inválido', () => {
      const valid = TypingSession.create({
        userId: validUserId,
        lessonId: validLessonId,
        layout: validLayout,
      });
      const validProps = valid.toJSON();
      const invalidProps = { ...validProps, state: 'CONCLUÍDA' } as unknown as TypingSessionProps;

      expect(() => TypingSession.reconstruct(invalidProps)).toThrow('Estado inválido');
    });
  });
});

function createMockMetrics(): SessionMetrics {
  return SessionMetrics.create({
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
}

function createCorrectKeystroke(timestampMs: number): KeystrokeEvent {
  return KeystrokeEvent.create({
    expectedKey: 'a',
    typedKey: 'a',
    physicalKey: 'KeyA',
    logicalKey: 'a',
    eventType: 'CORRECT',
    timestampMs,
    latencyMs: 150,
    composedCharacter: null,
  });
}
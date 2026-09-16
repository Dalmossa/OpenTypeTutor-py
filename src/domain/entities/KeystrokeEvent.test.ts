import { describe, it, expect } from 'vitest';
import { KeystrokeEvent } from './KeystrokeEvent.js';

describe('KeystrokeEvent', () => {
  describe('PRD §11 - KeystrokeEvent value object', () => {
    it('deve criar KeystrokeEvent CORRECT', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'a',
        typedKey: 'a',
        physicalKey: 'KeyA',
        logicalKey: 'a',
        eventType: 'CORRECT',
        timestampMs: 1000,
        latencyMs: 150,
        composedCharacter: null,
      });

      expect(event.expectedKey).toBe('a');
      expect(event.typedKey).toBe('a');
      expect(event.physicalKey).toBe('KeyA');
      expect(event.logicalKey).toBe('a');
      expect(event.eventType).toBe('CORRECT');
      expect(event.timestampMs).toBe(1000);
      expect(event.latencyMs).toBe(150);
      expect(event.composedCharacter).toBeNull();
    });

    it('deve criar KeystrokeEvent INCORRECT', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'a',
        typedKey: 's',
        physicalKey: 'KeyS',
        logicalKey: 's',
        eventType: 'INCORRECT',
        timestampMs: 1000,
        latencyMs: 200,
        composedCharacter: null,
      });

      expect(event.eventType).toBe('INCORRECT');
      expect(event.typedKey).toBe('s');
    });

    it('deve criar KeystrokeEvent CORRECTION', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'a',
        typedKey: null,
        physicalKey: 'Backspace',
        logicalKey: 'Backspace',
        eventType: 'CORRECTION',
        timestampMs: 1000,
        latencyMs: null,
        composedCharacter: null,
      });

      expect(event.eventType).toBe('CORRECTION');
      expect(event.typedKey).toBeNull();
      expect(event.latencyMs).toBeNull();
    });

    it('deve criar KeystrokeEvent DEAD_KEY_COMPOSE', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'á',
        typedKey: null,
        physicalKey: 'Quote',
        logicalKey: '\'',
        eventType: 'DEAD_KEY_COMPOSE',
        timestampMs: 1000,
        latencyMs: null,
        composedCharacter: null,
      });

      expect(event.eventType).toBe('DEAD_KEY_COMPOSE');
      expect(event.composedCharacter).toBeNull();
    });
  });

  describe('Dead keys - PRD §11.3', () => {
    it('deve suportar composedCharacter para dead keys', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'á',
        typedKey: 'a',
        physicalKey: 'KeyA',
        logicalKey: 'a',
        eventType: 'CORRECT',
        timestampMs: 1500,
        latencyMs: 200,
        composedCharacter: 'á',
      });

      expect(event.composedCharacter).toBe('á');
      expect(event.logicalKey).toBe('a');
      expect(event.expectedKey).toBe('á');
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para eventType inválido', () => {
      expect(() =>
        KeystrokeEvent.create({
          expectedKey: 'a',
          typedKey: 'a',
          physicalKey: 'KeyA',
          logicalKey: 'a',
          eventType: 'INVALID' as KeystrokeEvent['eventType'],
          timestampMs: 1000,
          latencyMs: 150,
          composedCharacter: null,
        })
      ).toThrow('EventType inválido');
    });

    it('deve lançar erro para timestamp negativo', () => {
      expect(() =>
        KeystrokeEvent.create({
          expectedKey: 'a',
          typedKey: 'a',
          physicalKey: 'KeyA',
          logicalKey: 'a',
          eventType: 'CORRECT',
          timestampMs: -1,
          latencyMs: 150,
          composedCharacter: null,
        })
      ).toThrow('Timestamp deve ser não-negativo');
    });

    it('deve lançar erro para latency negativa', () => {
      expect(() =>
        KeystrokeEvent.create({
          expectedKey: 'a',
          typedKey: 'a',
          physicalKey: 'KeyA',
          logicalKey: 'a',
          eventType: 'CORRECT',
          timestampMs: 1000,
          latencyMs: -1,
          composedCharacter: null,
        })
      ).toThrow('Latency deve ser não-negativo ou null');
    });
  });

  describe('PRD §11 - Predicados e serialização', () => {
    it('isCorrect deve retornar true apenas para CORRECT', () => {
      const correct = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 'a', physicalKey: 'KeyA', logicalKey: 'a',
        eventType: 'CORRECT', timestampMs: 1000, latencyMs: 150, composedCharacter: null,
      });
      const incorrect = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 's', physicalKey: 'KeyS', logicalKey: 's',
        eventType: 'INCORRECT', timestampMs: 1000, latencyMs: 200, composedCharacter: null,
      });

      expect(correct.isCorrect()).toBe(true);
      expect(incorrect.isCorrect()).toBe(false);
    });

    it('isIncorrect deve retornar true apenas para INCORRECT', () => {
      const incorrect = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 's', physicalKey: 'KeyS', logicalKey: 's',
        eventType: 'INCORRECT', timestampMs: 1000, latencyMs: 200, composedCharacter: null,
      });
      const correct = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 'a', physicalKey: 'KeyA', logicalKey: 'a',
        eventType: 'CORRECT', timestampMs: 1000, latencyMs: 150, composedCharacter: null,
      });

      expect(incorrect.isIncorrect()).toBe(true);
      expect(correct.isIncorrect()).toBe(false);
    });

    it('isCorrection deve retornar true apenas para CORRECTION', () => {
      const correction = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: null, physicalKey: 'Backspace', logicalKey: 'Backspace',
        eventType: 'CORRECTION', timestampMs: 1000, latencyMs: null, composedCharacter: null,
      });
      const correct = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 'a', physicalKey: 'KeyA', logicalKey: 'a',
        eventType: 'CORRECT', timestampMs: 1000, latencyMs: 150, composedCharacter: null,
      });

      expect(correction.isCorrection()).toBe(true);
      expect(correct.isCorrection()).toBe(false);
    });

    it('isDeadKeyCompose deve retornar true apenas para DEAD_KEY_COMPOSE', () => {
      const compose = KeystrokeEvent.create({
        expectedKey: 'á', typedKey: null, physicalKey: 'Quote', logicalKey: "'",
        eventType: 'DEAD_KEY_COMPOSE', timestampMs: 1000, latencyMs: null, composedCharacter: null,
      });
      const correct = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 'a', physicalKey: 'KeyA', logicalKey: 'a',
        eventType: 'CORRECT', timestampMs: 1000, latencyMs: 150, composedCharacter: null,
      });

      expect(compose.isDeadKeyCompose()).toBe(true);
      expect(correct.isDeadKeyCompose()).toBe(false);
    });

    it('toJSON deve retornar o mesmo formato do create', () => {
      const event = KeystrokeEvent.create({
        expectedKey: 'a', typedKey: 'a', physicalKey: 'KeyA', logicalKey: 'a',
        eventType: 'CORRECT', timestampMs: 1000, latencyMs: 150, composedCharacter: null,
      });
      const json = event.toJSON();

      expect(json.expectedKey).toBe('a');
      expect(json.typedKey).toBe('a');
      expect(json.eventType).toBe('CORRECT');
      expect(json.timestampMs).toBe(1000);
      expect(json.latencyMs).toBe(150);
    });
  });
});
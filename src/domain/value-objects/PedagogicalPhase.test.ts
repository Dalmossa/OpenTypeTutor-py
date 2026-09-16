import { describe, it, expect } from 'vitest';
import { PedagogicalPhase } from './PedagogicalPhase.js';

describe('PedagogicalPhase', () => {
  describe('RN25 - Criação e validação', () => {
    it('RN25 - deve criar fase válida HOME_ROW', () => {
      const phase = PedagogicalPhase.create('HOME_ROW');
      expect(phase.value).toBe('HOME_ROW');
    });

    it('RN25 - deve criar fase válida ACCENTUATION', () => {
      const phase = PedagogicalPhase.create('ACCENTUATION');
      expect(phase.value).toBe('ACCENTUATION');
    });

    it('RN25 - deve lançar erro para fase inválida', () => {
      expect(() => PedagogicalPhase.create('INVALID_PHASE')).toThrow('Fase pedagógica inválida');
    });

    it('RN25 - deve lançar erro para string vazia', () => {
      expect(() => PedagogicalPhase.create('')).toThrow('Fase pedagógica inválida');
    });
  });

  describe('RN25 - Ordem das fases', () => {
    it('RN25 - ERGONOMICS_SETUP deve ter ordem 0', () => {
      const phase = PedagogicalPhase.create('ERGONOMICS_SETUP');
      expect(phase.getOrder()).toBe(0);
    });

    it('RN25 - HOME_ROW deve ter ordem 1', () => {
      const phase = PedagogicalPhase.create('HOME_ROW');
      expect(phase.getOrder()).toBe(1);
    });

    it('RN25 - NUMERIC_KEYPAD deve ter ordem 6 (última)', () => {
      const phase = PedagogicalPhase.create('NUMERIC_KEYPAD');
      expect(phase.getOrder()).toBe(6);
    });

    it('RN25 - getAll deve retornar todas as 7 fases em ordem', () => {
      const phases = PedagogicalPhase.getAll();
      expect(phases).toHaveLength(7);
      expect(phases[0]?.value).toBe('ERGONOMICS_SETUP');
      expect(phases[6]?.value).toBe('NUMERIC_KEYPAD');
    });
  });

  describe('RN25 - Navegação entre fases', () => {
    it('RN25 - getNext de HOME_ROW deve retornar UPPER_LOWER_ROWS', () => {
      const phase = PedagogicalPhase.create('HOME_ROW');
      const next = phase.getNext();
      expect(next).not.toBeNull();
      if (next) expect(next.value).toBe('UPPER_LOWER_ROWS');
    });

    it('RN25 - getNext de NUMERIC_KEYPAD deve retornar null (última fase)', () => {
      const phase = PedagogicalPhase.create('NUMERIC_KEYPAD');
      const next = phase.getNext();
      expect(next).toBeNull();
    });

    it('RN25 - getPrevious de UPPER_LOWER_ROWS deve retornar HOME_ROW', () => {
      const phase = PedagogicalPhase.create('UPPER_LOWER_ROWS');
      const prev = phase.getPrevious();
      expect(prev).not.toBeNull();
      if (prev) expect(prev.value).toBe('HOME_ROW');
    });

    it('RN25 - getPrevious de ERGONOMICS_SETUP deve retornar null (primeira fase)', () => {
      const phase = PedagogicalPhase.create('ERGONOMICS_SETUP');
      const prev = phase.getPrevious();
      expect(prev).toBeNull();
    });
  });

  describe('RN25 - Igualdade', () => {
    it('RN25 - fases com mesmo valor devem ser iguais', () => {
      const phase1 = PedagogicalPhase.create('HOME_ROW');
      const phase2 = PedagogicalPhase.create('HOME_ROW');
      expect(phase1.equals(phase2)).toBe(true);
    });

    it('RN25 - fases com valores diferentes não devem ser iguais', () => {
      const phase1 = PedagogicalPhase.create('HOME_ROW');
      const phase2 = PedagogicalPhase.create('ACCENTUATION');
      expect(phase1.equals(phase2)).toBe(false);
    });
  });

  describe('RN25 - Serialização', () => {
    it('RN25 - toString deve retornar valor', () => {
      const phase = PedagogicalPhase.create('WORD_FIXATION');
      expect(phase.toString()).toBe('WORD_FIXATION');
    });

    it('RN25 - toJSON deve retornar valor', () => {
      const phase = PedagogicalPhase.create('LONG_TEXTS');
      expect(phase.toJSON()).toBe('LONG_TEXTS');
    });
  });
});
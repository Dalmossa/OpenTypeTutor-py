import { describe, it, expect } from 'vitest';
import { Layout } from './Layout.js';

describe('Layout', () => {
  describe('PRD §6 - Layout suportado ABNT2', () => {
    it('deve criar Layout ABNT2 válido', () => {
      const layout = Layout.create('ABNT2');
      expect(layout.value).toBe('ABNT2');
    });
  });

  describe('PRD §6 - Layout suportado US-INTERNATIONAL', () => {
    it('deve criar Layout US-INTERNATIONAL válido', () => {
      const layout = Layout.create('US-INTERNATIONAL');
      expect(layout.value).toBe('US-INTERNATIONAL');
    });
  });

  describe('RN11 - Isolamento de KeyPerformance por layout', () => {
    it('Layouts diferentes não devem ser iguais', () => {
      const abnt2 = Layout.create('ABNT2');
      const usIntl = Layout.create('US-INTERNATIONAL');
      expect(abnt2.equals(usIntl)).toBe(false);
    });

    it('Layouts iguais devem ser iguais', () => {
      const abnt2a = Layout.create('ABNT2');
      const abnt2b = Layout.create('ABNT2');
      expect(abnt2a.equals(abnt2b)).toBe(true);
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para layout inválido', () => {
      expect(() => Layout.create('INVALID')).toThrow('Layout inválido');
    });

    it('deve lançar erro para string vazia', () => {
      expect(() => Layout.create('')).toThrow('Layout inválido');
    });

    it('deve lançar erro para null/undefined', () => {
      expect(() => Layout.create(null as unknown as string)).toThrow('Layout inválido');
      expect(() => Layout.create(undefined as unknown as string)).toThrow('Layout inválido');
    });
  });

  describe('Serialização', () => {
    it('toString deve retornar o valor', () => {
      const layout = Layout.create('ABNT2');
      expect(layout.toString()).toBe('ABNT2');
    });

    it('JSON serialization deve funcionar', () => {
      const layout = Layout.create('US-INTERNATIONAL');
      expect(JSON.stringify(layout)).toBe('"US-INTERNATIONAL"');
    });
  });
});
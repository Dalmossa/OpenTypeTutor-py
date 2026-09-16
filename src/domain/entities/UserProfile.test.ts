import { describe, it, expect } from 'vitest';
import { UserProfile } from './UserProfile.js';
import { Layout } from '../value-objects/Layout.js';
import { SessionId } from '../value-objects/SessionId.js';

describe('UserProfile', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLayout = Layout.create('ABNT2');

  describe('PRD §7 - UserProfile entity', () => {
    it('deve criar UserProfile com campos obrigatórios', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      expect(profile.userId).toBe(validUserId);
      expect(profile.activeLayout).toBe(validLayout);
      expect(profile.currentLevel).toBe(1);
    });

    it('deve usar layout ABNT2 como padrão', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        currentLevel: 1,
      });

      expect(profile.activeLayout.value).toBe('ABNT2');
    });

    it('deve usar level 1 como padrão', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
      });

      expect(profile.currentLevel).toBe(1);
    });

    it('deve aceitar layout US-INTERNATIONAL', () => {
      const usLayout = Layout.create('US-INTERNATIONAL');
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: usLayout,
        currentLevel: 2,
      });

      expect(profile.activeLayout.value).toBe('US-INTERNATIONAL');
      expect(profile.currentLevel).toBe(2);
    });
  });

  describe('Atualização de layout', () => {
    it('deve permitir alterar activeLayout', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      const newLayout = Layout.create('US-INTERNATIONAL');
      const updated = profile.changeLayout(newLayout);

      expect(updated.activeLayout).toBe(newLayout);
      expect(updated.userId.equals(profile.userId)).toBe(true);
    });
  });

  describe('Atualização de nível', () => {
    it('deve permitir avançar de nível', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      const updated = profile.advanceLevel();

      expect(updated.currentLevel).toBe(2);
      expect(profile.currentLevel).toBe(1);
    });

    it('não deve permitir nível menor que 1', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      expect(() => profile.setLevel(0)).toThrow('Nível deve ser maior ou igual a 1');
      expect(() => profile.setLevel(-1)).toThrow('Nível deve ser maior ou igual a 1');
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para userId inválido', () => {
      expect(() =>
        UserProfile.create({
          userId: 'invalid' as unknown as SessionId,
          activeLayout: validLayout,
          currentLevel: 1,
        })
      ).toThrow();
    });

    it('deve lançar erro para layout inválido', () => {
      expect(() =>
        UserProfile.create({
          userId: validUserId,
          activeLayout: 'invalid' as unknown as Layout,
          currentLevel: 1,
        })
      ).toThrow();
    });

    it('deve lançar erro para nível menor que 1', () => {
      expect(() =>
        UserProfile.create({
          userId: validUserId,
          activeLayout: validLayout,
          currentLevel: 0,
        })
      ).toThrow('Nível deve ser maior ou igual a 1');
    });
  });

  describe('Igualdade', () => {
    it('Profiles com mesmo userId devem ser iguais', () => {
      const profile1 = UserProfile.create({ userId: validUserId, activeLayout: validLayout, currentLevel: 1 });
      const profile2 = UserProfile.create({ userId: validUserId, activeLayout: Layout.create('US-INTERNATIONAL'), currentLevel: 5 });

      expect(profile1.equals(profile2)).toBe(true);
    });

    it('Profiles com userIds diferentes não devem ser iguais', () => {
      const profile1 = UserProfile.create({ userId: validUserId, activeLayout: validLayout, currentLevel: 1 });
      const profile2 = UserProfile.create({ userId: SessionId.create(), activeLayout: validLayout, currentLevel: 1 });

      expect(profile1.equals(profile2)).toBe(false);
    });
  });

  describe('Serialização', () => {
    it('toDTO deve retornar dados corretos', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 3,
      });

      const dto = profile.toDTO();

      expect(dto.userId).toBe(validUserId.value);
      expect(dto.activeLayout).toBe('ABNT2');
      expect(dto.currentLevel).toBe(3);
    });
  });

  describe('PRD §7 - Validação e serialização (complementar)', () => {
    it('changeLayout deve rejeitar layout inválido', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      expect(() => profile.changeLayout('invalid' as unknown as Layout)).toThrow('Layout inválido');
    });

    it('setLevel deve permitir definir nível válido', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 1,
      });

      const updated = profile.setLevel(5);

      expect(updated.currentLevel).toBe(5);
    });

    it('toJSON deve delegar para toDTO', () => {
      const profile = UserProfile.create({
        userId: validUserId,
        activeLayout: validLayout,
        currentLevel: 2,
      });

      const json = profile.toJSON();

      expect(json.userId).toBe(validUserId.value);
      expect(json.activeLayout).toBe('ABNT2');
      expect(json.currentLevel).toBe(2);
    });
  });
});
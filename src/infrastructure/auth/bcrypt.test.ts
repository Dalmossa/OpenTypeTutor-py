import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './bcrypt.js';

describe('bcrypt', () => {
  describe('hashPassword', () => {
    it('deve gerar hash da senha', async () => {
      const hash = await hashPassword('minhaSenha123');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('minhaSenha123');
    });

    it('deve gerar hashes diferentes para a mesma senha (sal único)', async () => {
      const hash1 = await hashPassword('minhaSenha123');
      const hash2 = await hashPassword('minhaSenha123');
      expect(hash1).not.toBe(hash2);
    });

    it('deve gerar hash com formato bcrypt válido', async () => {
      const hash = await hashPassword('minhaSenha123');
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.+/);
    });
  });

  describe('comparePassword', () => {
    it('deve retornar true para senha correta', async () => {
      const hash = await hashPassword('minhaSenha123');
      const result = await comparePassword('minhaSenha123', hash);
      expect(result).toBe(true);
    });

    it('deve retornar false para senha incorreta', async () => {
      const hash = await hashPassword('minhaSenha123');
      const result = await comparePassword('senhaErrada', hash);
      expect(result).toBe(false);
    });

    it('deve retornar false para string vazia', async () => {
      const hash = await hashPassword('minhaSenha123');
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });
});

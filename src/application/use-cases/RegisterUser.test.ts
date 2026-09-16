import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUser } from './RegisterUser.js';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository.js';
import { BcryptPasswordHasher } from '../../infrastructure/auth/BcryptPasswordHasher.js';
import { AuthPasswordValidator } from '../../infrastructure/auth/AuthPasswordValidator.js';
import { Email } from '../../domain/value-objects/Email.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { UserAlreadyExistsError } from '../../domain/errors/DomainError.js';

describe('RegisterUser', () => {
  let userRepository: InMemoryUserRepository;
  let registerUser: RegisterUser;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    registerUser = new RegisterUser(
      userRepository,
      new BcryptPasswordHasher(),
      new AuthPasswordValidator()
    );
  });

  describe('US-001 - Registro de usuário', () => {
    it('deve registrar usuário com dados válidos', async () => {
      const result = await registerUser.execute({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha1234',
      });

      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('string');
    });

    it('deve salvar usuário no repositório', async () => {
      const result = await registerUser.execute({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha1234',
      });

      const user = await userRepository.findById(SessionId.create(result.userId));
      expect(user).not.toBeNull();
      expect(user?.name).toBe('João Silva');
      expect(user?.email.value).toBe('joao@example.com');
    });

    it('deve armazenar senha hasheada, não texto puro', async () => {
      await registerUser.execute({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha1234',
      });

      const user = await userRepository.findByEmail(Email.create('joao@example.com'));
      expect(user).not.toBeNull();
      expect(user?.passwordHash).not.toBe('senha1234');
      expect(user?.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    it('deve rejeitar email duplicado', async () => {
      await registerUser.execute({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha1234',
      });

      await expect(
        registerUser.execute({
          name: 'Outro João',
          email: 'joao@example.com',
          password: 'outrasenha123',
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it('deve rejeitar senha curta (menos de 8 caracteres)', async () => {
      await expect(
        registerUser.execute({
          name: 'João Silva',
          email: 'joao@example.com',
          password: '1234567',
        })
      ).rejects.toThrow('Senha deve ter pelo menos 8 caracteres');
    });

    it('deve rejeitar nome vazio', async () => {
      await expect(
        registerUser.execute({
          name: '',
          email: 'joao@example.com',
          password: 'senha1234',
        })
      ).rejects.toThrow('Nome é obrigatório');
    });

    it('deve rejeitar email inválido', async () => {
      await expect(
        registerUser.execute({
          name: 'João Silva',
          email: 'emailinvalido',
          password: 'senha1234',
        })
      ).rejects.toThrow();
    });
  });
});

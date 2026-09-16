import { describe, it, expect, beforeEach } from 'vitest';
import { Login } from './Login.js';
import { RegisterUser } from './RegisterUser.js';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository.js';
import { InvalidCredentialsError } from '../../domain/errors/DomainError.js';
import { verifyToken } from '../../infrastructure/auth/jwt.js';
import { verifyRefreshToken } from '../../infrastructure/auth/refreshToken.js';
import { BcryptPasswordHasher } from '../../infrastructure/auth/BcryptPasswordHasher.js';
import { AuthPasswordValidator } from '../../infrastructure/auth/AuthPasswordValidator.js';
import { JwtTokenService } from '../../infrastructure/auth/JwtTokenService.js';

describe('Login', () => {
  let userRepository: InMemoryUserRepository;
  let registerUser: RegisterUser;
  let login: Login;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    registerUser = new RegisterUser(
      userRepository,
      new BcryptPasswordHasher(),
      new AuthPasswordValidator()
    );
    login = new Login(userRepository, new BcryptPasswordHasher(), new JwtTokenService());

    await registerUser.execute({
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'senha1234',
    });
  });

  describe('US-002 - Login', () => {
    it('deve retornar access token e refresh token para credenciais corretas', async () => {
      const result = await login.execute({
        email: 'joao@example.com',
        password: 'senha1234',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('deve retornar access token JWT válido', async () => {
      const result = await login.execute({
        email: 'joao@example.com',
        password: 'senha1234',
      });

      const payload = verifyToken(result.accessToken);
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('deve retornar refresh token JWT válido', async () => {
      const result = await login.execute({
        email: 'joao@example.com',
        password: 'senha1234',
      });

      const payload = verifyRefreshToken(result.refreshToken);
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('jti');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('deve rejeitar email inexistente', async () => {
      await expect(
        login.execute({
          email: 'inexistente@example.com',
          password: 'senha1234',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('deve rejeitar senha incorreta', async () => {
      await expect(
        login.execute({
          email: 'joao@example.com',
          password: 'senhaerrada',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('deve rejeitar email inválido', async () => {
      await expect(
        login.execute({
          email: 'emailinvalido',
          password: 'senha1234',
        })
      ).rejects.toThrow();
    });
  });
});

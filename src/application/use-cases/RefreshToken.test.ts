import { describe, it, expect, beforeEach } from "vitest";
import { RefreshToken } from "./RefreshToken.js";
import { Login } from "./Login.js";
import { RegisterUser } from "./RegisterUser.js";
import { InMemoryUserRepository } from "../../infrastructure/repositories/InMemoryUserRepository.js";
import { verifyToken } from "../../infrastructure/auth/jwt.js";
import {
  verifyRefreshToken,
  isRefreshTokenRevoked,
  generateRefreshToken,
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
} from "../../infrastructure/auth/refreshToken.js";
import { BcryptPasswordHasher } from "../../infrastructure/auth/BcryptPasswordHasher.js";
import { AuthPasswordValidator } from "../../infrastructure/auth/AuthPasswordValidator.js";
import { JwtTokenService } from "../../infrastructure/auth/JwtTokenService.js";

describe("RefreshToken", () => {
  let userRepository: InMemoryUserRepository;
  let registerUser: RegisterUser;
  let login: Login;
  let refreshToken: RefreshToken;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    registerUser = new RegisterUser(
      userRepository,
      new BcryptPasswordHasher(),
      new AuthPasswordValidator(),
    );
    login = new Login(
      userRepository,
      new BcryptPasswordHasher(),
      new JwtTokenService(),
    );
    refreshToken = new RefreshToken(new JwtTokenService(), userRepository);

    await registerUser.execute({
      name: "João Silva",
      email: "joao@example.com",
      password: "senha1234",
    });
  });

  describe("TASK-034c - POST /auth/refresh", () => {
    it("deve retornar novos tokens para refresh token válido", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      const result = await refreshToken.execute({
        refreshToken: loginResult.refreshToken,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
    });

    it("deve retornar access token JWT válido", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      const result = await refreshToken.execute({
        refreshToken: loginResult.refreshToken,
      });

      const payload = verifyToken(result.accessToken);
      expect(payload).toHaveProperty("userId");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("deve retornar refresh token JWT válido", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      const result = await refreshToken.execute({
        refreshToken: loginResult.refreshToken,
      });

      const payload = verifyRefreshToken(result.refreshToken);
      expect(payload).toHaveProperty("userId");
      expect(payload).toHaveProperty("jti");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("deve revogar refresh token antigo após rotação", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      const oldRefreshTokenPayload = verifyRefreshToken(
        loginResult.refreshToken,
      );

      await refreshToken.execute({
        refreshToken: loginResult.refreshToken,
      });

      expect(isRefreshTokenRevoked(oldRefreshTokenPayload.jti)).toBe(true);
    });

    it("deve rejeitar refresh token revogado", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      await refreshToken.execute({
        refreshToken: loginResult.refreshToken,
      });

      await expect(
        refreshToken.execute({
          refreshToken: loginResult.refreshToken,
        }),
      ).rejects.toThrow(InvalidRefreshTokenError);
    });

    it("deve rejeitar refresh token inválido", async () => {
      await expect(
        refreshToken.execute({
          refreshToken: "tokeninvalido",
        }),
      ).rejects.toThrow(InvalidRefreshTokenError);
    });

    it("deve rejeitar refresh token expirado", async () => {
      const loginResult = await login.execute({
        email: "joao@example.com",
        password: "senha1234",
      });

      const oldPayload = verifyRefreshToken(loginResult.refreshToken);
      const expiredToken = generateRefreshToken(oldPayload.userId, "-1s");

      await expect(
        refreshToken.execute({
          refreshToken: expiredToken,
        }),
      ).rejects.toThrow(RefreshTokenExpiredError);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { AdminResetUserPassword } from "./AdminResetUserPassword.js";
import { InMemoryUserRepository } from "../../infrastructure/repositories/InMemoryUserRepository.js";
import { JwtTokenService } from "../../infrastructure/auth/JwtTokenService.js";
import {
  generateRefreshToken,
  verifyRefreshToken,
} from "../../infrastructure/auth/refreshToken.js";
import type { IPasswordHasher } from "../ports/IPasswordHasher.js";
import { User } from "../../domain/entities/User.js";
import { Email } from "../../domain/value-objects/Email.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { UserNotFoundError } from "../../domain/errors/DomainError.js";

const USER_ID = "550e8400-e29b-41d4-a716-4466554407a1";

const fakeHasher: IPasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  compare: (password, hash) => Promise.resolve(hash === `hashed:${password}`),
};

describe("AdminResetUserPassword", () => {
  let userRepository: InMemoryUserRepository;
  let tokenService: JwtTokenService;
  let useCase: AdminResetUserPassword;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    await userRepository.save(
      User.create({
        id: SessionId.create(USER_ID),
        name: "Alvo",
        email: Email.create("alvo@exemplo.com"),
        passwordHash: "hashed:senha-antiga",
        createdAt: new Date("2026-09-26T12:00:00.000Z"),
        role: "user",
      }),
    );
    tokenService = new JwtTokenService();
    useCase = new AdminResetUserPassword(
      userRepository,
      fakeHasher,
      tokenService,
    );
  });

  it("redefine a senha do usuário", async () => {
    await useCase.execute({ userId: USER_ID, newPassword: "senha-nova-123" });

    const user = await userRepository.findById(SessionId.create(USER_ID));
    expect(user?.passwordHash).toBe("hashed:senha-nova-123");
  });

  it("lança UserNotFoundError para usuário inexistente", async () => {
    await expect(
      useCase.execute({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        newPassword: "senha-nova-123",
      }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it("invalida os refresh tokens existentes — o reset expulsa a sessão", async () => {
    // Esta é a propriedade que faltava: antes, trocar a senha deixava as
    // sessões antigas válidas por mais 30 dias, e o reset não expulsava quem
    // tivesse a conta comprometida.
    const tokenCelular = tokenService.signRefreshToken(USER_ID);
    const tokenNotebook = tokenService.signRefreshToken(USER_ID);
    expect(() => verifyRefreshToken(tokenCelular)).not.toThrow();

    await useCase.execute({ userId: USER_ID, newPassword: "senha-nova-123" });

    expect(() => verifyRefreshToken(tokenCelular)).toThrow();
    expect(() => verifyRefreshToken(tokenNotebook)).toThrow();
  });

  it("não invalida as sessões de outro usuário", async () => {
    const outroId = "550e8400-e29b-41d4-a716-4466554407b2";
    await userRepository.save(
      User.create({
        id: SessionId.create(outroId),
        name: "Outro",
        email: Email.create("outro@exemplo.com"),
        passwordHash: "hashed:senha-antiga",
        createdAt: new Date("2026-09-26T12:00:00.000Z"),
        role: "user",
      }),
    );
    const tokenDele = tokenService.signRefreshToken(outroId);

    await useCase.execute({ userId: USER_ID, newPassword: "senha-nova-123" });

    expect(() => verifyRefreshToken(tokenDele)).not.toThrow();
  });

  it("permite login novo depois do reset", async () => {
    // O reset não pode revogar as sessões para sempre: um novo login precisa
    // funcionar, e o caso de uso é o caminho de recuperação de conta.
    await useCase.execute({ userId: USER_ID, newPassword: "senha-nova-123" });

    const novoToken = tokenService.signRefreshToken(USER_ID);

    expect(verifyRefreshToken(novoToken).userId).toBe(USER_ID);
  });

  it("revoga tokens emitidos fora do JwtTokenService, desde que sejam rastreados", () => {
    // `generateRefreshToken` é o ponto único de emissão; o serviço é só um
    // delegador. Este teste fixa que a revogação não depende do caminho de
    // entrada, só do rastreio.
    const token = generateRefreshToken(USER_ID);

    tokenService.revokeAllRefreshTokensForUser(USER_ID);

    expect(() => verifyRefreshToken(token)).toThrow();
  });
});

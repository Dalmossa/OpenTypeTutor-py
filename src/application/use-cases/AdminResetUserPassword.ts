import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordHasher } from "../ports/IPasswordHasher.js";
import type { ITokenService } from "../ports/ITokenService.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { UserNotFoundError } from "../../domain/errors/DomainError.js";
import type {
  AdminResetUserPasswordDTO,
  AdminResetUserPasswordResponseDTO,
} from "../dtos/PasswordResetDTOs.js";

export class AdminResetUserPassword {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(
    dto: AdminResetUserPasswordDTO,
  ): Promise<AdminResetUserPasswordResponseDTO> {
    const user = await this.userRepository.findById(
      SessionId.create(dto.userId),
    );
    if (!user) {
      throw new UserNotFoundError("Usuário não encontrado");
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
    await this.userRepository.updatePassword(user.id, newPasswordHash);

    // Revoga as sessões existentes — é o que dá sentido ao reset. Sem esta
    // linha, a conta recuperada continua com os refresh tokens antigos válidos
    // por 30 dias, e o reset não expulsa quem tivesse a conta comprometida.
    //
    // `id.value` e não `id`: `Login` assina o token com `user.id.value`, e o
    // mapa de revogação é chaveado pelo mesmo `userId` do JWT. Passar o `id`
    // com `toString()` daria a mesma string aqui, mas a identidade fica explícita.
    this.tokenService.revokeAllRefreshTokensForUser(user.id.value);

    return { message: "Senha do usuário redefinida pelo administrador." };
  }
}

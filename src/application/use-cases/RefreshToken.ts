import type { ITokenService } from "../ports/ITokenService.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { UserNotFoundError } from "../../domain/errors/DomainError.js";
import type {
  RefreshTokenDTO,
  RefreshTokenResponseDTO,
} from "../dtos/RefreshTokenDTO.js";

export class RefreshToken {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: RefreshTokenDTO): Promise<RefreshTokenResponseDTO> {
    const payload = this.tokenService.verifyRefreshToken(dto.refreshToken);

    this.tokenService.revokeRefreshToken(payload.jti);

    const user = await this.userRepository.findById(
      SessionId.create(payload.userId),
    );
    if (!user) {
      throw new UserNotFoundError("Usuário não encontrado");
    }

    const accessToken = this.tokenService.signAccessToken(
      user.id.value,
      user.role,
    );
    const newRefreshToken = this.tokenService.signRefreshToken(user.id.value);

    return { accessToken, refreshToken: newRefreshToken };
  }
}

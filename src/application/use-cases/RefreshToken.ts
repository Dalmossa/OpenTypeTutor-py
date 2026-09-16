import type { ITokenService } from '../ports/ITokenService.js';
import type { RefreshTokenDTO, RefreshTokenResponseDTO } from '../dtos/RefreshTokenDTO.js';

export class RefreshToken {
  constructor(private readonly tokenService: ITokenService) {}

  execute(dto: RefreshTokenDTO): RefreshTokenResponseDTO {
    const payload = this.tokenService.verifyRefreshToken(dto.refreshToken);

    this.tokenService.revokeRefreshToken(payload.jti);

    const accessToken = this.tokenService.signAccessToken(payload.userId);
    const newRefreshToken = this.tokenService.signRefreshToken(payload.userId);

    return { accessToken, refreshToken: newRefreshToken };
  }
}
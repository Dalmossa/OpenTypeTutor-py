import type { ITokenService } from "../../application/ports/ITokenService.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  signToken,
  verifyToken,
  InvalidTokenError,
  TokenExpiredError,
  type TokenPayload,
} from "./jwt.js";
import {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} from "./refreshToken.js";

export class JwtTokenService implements ITokenService {
  signAccessToken(userId: string, role: "user" | "admin" = "user"): string {
    return signToken(userId, role);
  }

  signRefreshToken(userId: string): string {
    return generateRefreshToken(userId);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return verifyToken(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw AppError.unauthorized(
          "TOKEN_EXPIRED",
          "Token de acesso expirado",
        );
      }
      if (error instanceof InvalidTokenError) {
        throw AppError.unauthorized(
          "INVALID_TOKEN",
          "Token de acesso inválido",
        );
      }
      throw AppError.unauthorized("UNAUTHORIZED", "Token de acesso inválido");
    }
  }

  verifyRefreshToken(token: string): { userId: string; jti: string } {
    const payload = verifyRefreshToken(token);
    return { userId: payload.userId, jti: payload.jti };
  }

  revokeRefreshToken(jti: string): void {
    revokeRefreshToken(jti);
  }

  revokeAllRefreshTokensForUser(userId: string): number {
    return revokeAllRefreshTokensForUser(userId);
  }
}

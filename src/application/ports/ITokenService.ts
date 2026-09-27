export interface ITokenService {
  signAccessToken(userId: string, role: "user" | "admin"): string;
  signRefreshToken(userId: string): string;
  verifyAccessToken(token: string): { userId: string; role: "user" | "admin" };
  verifyRefreshToken(token: string): { userId: string; jti: string };
  revokeRefreshToken(jti: string): void;
  /**
   * Revoga todos os refresh tokens de um usuário e devolve quantos foram.
   *
   * Usado pelo reset de senha por admin: trocar a senha não expulsa ninguém se
   * as sessões antigas continuarem válidas por mais 30 dias.
   */
  revokeAllRefreshTokensForUser(userId: string): number;
}

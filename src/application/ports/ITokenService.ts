export interface ITokenService {
  signAccessToken(userId: string): string;
  signRefreshToken(userId: string): string;
  verifyAccessToken(token: string): string;
  verifyRefreshToken(token: string): { userId: string; jti: string };
  revokeRefreshToken(jti: string): void;
}
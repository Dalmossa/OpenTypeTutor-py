import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { authParams } from './authParams.js';
import { JWT_SECRET } from './secrets.js';

const revokedTokens = new Set<string>();

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
  iat: number;
  exp: number;
}

export class RefreshTokenExpiredError extends Error {
  readonly code = 'REFRESH_TOKEN_EXPIRED';
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenExpiredError';
  }
}

export class InvalidRefreshTokenError extends Error {
  readonly code = 'INVALID_REFRESH_TOKEN';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRefreshTokenError';
  }
}

export function generateRefreshToken(userId: string, expiresIn?: SignOptions['expiresIn']): string {
  const jti = crypto.randomUUID();
  return jwt.sign({ userId, jti }, JWT_SECRET, {
    expiresIn: expiresIn ?? authParams.JWT_REFRESH_EXPIRATION,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;

    if (revokedTokens.has(payload.jti)) {
      throw new InvalidRefreshTokenError('Refresh token foi revogado');
    }

    return payload;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new RefreshTokenExpiredError('Refresh token expirado');
    }
    throw new InvalidRefreshTokenError('Refresh token inválido');
  }
}

export function revokeRefreshToken(jti: string): void {
  revokedTokens.add(jti);
}

export function isRefreshTokenRevoked(jti: string): boolean {
  return revokedTokens.has(jti);
}

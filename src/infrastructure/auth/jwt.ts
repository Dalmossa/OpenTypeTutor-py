import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { authParams } from "./authParams.js";
import { JWT_SECRET } from "./secrets.js";

export interface TokenPayload {
  userId: string;
  role: "user" | "admin";
  iat: number;
  exp: number;
}

export class TokenExpiredError extends Error {
  readonly code = "TOKEN_EXPIRED";
  constructor(message: string) {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends Error {
  readonly code = "INVALID_TOKEN";
  constructor(message: string) {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export function signToken(
  userId: string,
  role: "user" | "admin",
  expiresIn?: SignOptions["expiresIn"],
): string {
  return jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: expiresIn ?? authParams.JWT_ACCESS_EXPIRATION,
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError("Token expirado");
    }
    throw new InvalidTokenError("Token inválido");
  }
}

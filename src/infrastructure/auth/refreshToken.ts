import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { authParams } from "./authParams.js";
import { JWT_SECRET } from "./secrets.js";
import { MS_PER_SECOND } from "../../domain/config/timeUnits.js";

const revokedTokens = new Set<string>();

/**
 * `jti` emitidos por usuário, com o `exp` de cada um.
 *
 * Existe porque revogação por `jti` não basta para o reset de senha por admin:
 * o requisito é expulsar **todas** as sessões do usuário, e o JWT só carrega
 * `{userId, jti}` — sem esta tabela não há como enumerar os tokens de alguém.
 * Guardar o `exp` permite podar o que já expirou, senão o mapa cresce a cada
 * refresh (TTL de 30 dias) sem nunca liberar memória.
 */
const issuedTokensByUser = new Map<string, Map<string, number>>();

/** Mapa inverso, para que a revogação por `jti` saiba de qual usuário limpar. */
const userIdByJti = new Map<string, string>();

/** Remove do mapa os `jti` cujo token já expirou. */
function pruneExpiredIssuedTokens(
  userId: string,
  userTokens: Map<string, number>,
  nowMs: number,
): void {
  for (const [jti, expiresAt] of userTokens) {
    if (expiresAt <= nowMs) {
      userTokens.delete(jti);
      userIdByJti.delete(jti);
    }
  }
  if (userTokens.size === 0) {
    issuedTokensByUser.delete(userId);
  }
}

function trackIssuedToken(
  userId: string,
  jti: string,
  expiresAt: number,
): void {
  userIdByJti.set(jti, userId);
  const userTokens = issuedTokensByUser.get(userId);
  if (!userTokens) {
    issuedTokensByUser.set(userId, new Map([[jti, expiresAt]]));
    return;
  }
  pruneExpiredIssuedTokens(userId, userTokens, Date.now());
  userTokens.set(jti, expiresAt);
}

/**
 * Lê o `exp` do token recém-assinado e converte para milissegundos.
 *
 * Preferimos decodificar o token a recalcular a validade: `authParams
 * .JWT_REFRESH_EXPIRATION` é a string `'30d'`, e duplicar esse parse aqui
 * criaria uma segunda fonte de verdade que envelhece em silêncio quando alguém
 * mudar a validade.
 *
 * A conversão não é cosmética: o `exp` do JWT (RFC 7519, `NumericDate`) é em
 * **segundos**, e comparar esse número com `Date.now()` — em milissegundos —
 * faz `expiresAt <= now` ser sempre verdade, o que poda o token no mesmo
 * instante em que ele é emitido. Sem `exp` o `jti` fica com `Infinity`, que
 * nunca é podado.
 */
function readExpirationMs(token: string): number {
  const payload = jwt.decode(token) as { exp?: number } | null;
  if (payload?.exp === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  return payload.exp * MS_PER_SECOND;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
  iat: number;
  exp: number;
}

export class RefreshTokenExpiredError extends Error {
  readonly code = "REFRESH_TOKEN_EXPIRED";
  constructor(message: string) {
    super(message);
    this.name = "RefreshTokenExpiredError";
  }
}

export class InvalidRefreshTokenError extends Error {
  readonly code = "INVALID_REFRESH_TOKEN";
  constructor(message: string) {
    super(message);
    this.name = "InvalidRefreshTokenError";
  }
}

export function generateRefreshToken(
  userId: string,
  expiresIn?: SignOptions["expiresIn"],
): string {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId, jti }, JWT_SECRET, {
    expiresIn: expiresIn ?? authParams.JWT_REFRESH_EXPIRATION,
  });
  trackIssuedToken(userId, jti, readExpirationMs(token));
  return token;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;

    if (revokedTokens.has(payload.jti)) {
      throw new InvalidRefreshTokenError("Refresh token foi revogado");
    }

    return payload;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new RefreshTokenExpiredError("Refresh token expirado");
    }
    throw new InvalidRefreshTokenError("Refresh token inválido");
  }
}

export function revokeRefreshToken(jti: string): void {
  revokedTokens.add(jti);
  forgetTrackedToken(jti);
}

/**
 * Revoga **todos** os refresh tokens de um usuário. É o que o reset de senha
 * por admin precisa: sem isso a senha nova convive com sessões antigas ainda
 * válidas por 30 dias, e o reset não expulsa quem tinha a conta comprometida.
 *
 * Devolve quantos tokens foram revogados, para o log do chamador.
 *
 * Limitação conhecida e herdada do design atual: a revogação é **em memória**,
 * então um restart do processo ressuscita tokens já revogados. A troca
 * definitiva é persistir a revogação (tabela ou `tokenVersion` no usuário) —
 * está fora do escopo desta correção, que fecha o TODO do caso de uso sem
 * prometer uma garantia que o armazenamento não dá.
 */
export function revokeAllRefreshTokensForUser(userId: string): number {
  const userTokens = issuedTokensByUser.get(userId);
  if (!userTokens) {
    return 0;
  }
  for (const jti of userTokens.keys()) {
    revokedTokens.add(jti);
  }
  issuedTokensByUser.delete(userId);
  for (const jti of userTokens.keys()) {
    userIdByJti.delete(jti);
  }
  return userTokens.size;
}

function forgetTrackedToken(jti: string): void {
  const userId = userIdByJti.get(jti);
  if (userId === undefined) {
    return;
  }
  userIdByJti.delete(jti);
  const userTokens = issuedTokensByUser.get(userId);
  if (!userTokens) {
    return;
  }
  userTokens.delete(jti);
  if (userTokens.size === 0) {
    issuedTokensByUser.delete(userId);
  }
}

export function isRefreshTokenRevoked(jti: string): boolean {
  return revokedTokens.has(jti);
}

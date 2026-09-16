// Roteamento de refresh via cookie httpOnly (TASK-078, ADR-013/016).
// Max-ages espelham ADR-010 / infra/auth/authParams.ts: access 15m, refresh 30d.
export const ACCESS_TOKEN_COOKIE = 'ott_access';
export const REFRESH_TOKEN_COOKIE = 'ott_refresh';

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const rateLimitParams = {
  LOGIN_MAX_ATTEMPTS: 10,
  LOGIN_WINDOW_MS: 900000,
  REFRESH_MAX_ATTEMPTS: 30,
  REFRESH_WINDOW_MS: 900000,
} as const;

export type RateLimitParams = typeof rateLimitParams;

export const authParams = {
  BCRYPT_SALT_ROUNDS: 12,
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '30d',
  MIN_PASSWORD_LENGTH: 8,
} as const;

export type AuthParams = typeof authParams;
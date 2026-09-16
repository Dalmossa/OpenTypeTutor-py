const FALLBACK_DEV_SECRET = 'dev-secret-change-in-production';

export const JWT_SECRET: string = process.env.JWT_SECRET ?? FALLBACK_DEV_SECRET;
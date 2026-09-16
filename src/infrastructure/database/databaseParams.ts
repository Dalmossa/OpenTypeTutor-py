export const databaseParams = {
  DATABASE_PATH: process.env['DB_PATH'] ?? './data/opentype.sqlite',
  ENABLE_WAL: true,
  BUSY_TIMEOUT_MS: 5000,
} as const;
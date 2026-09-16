import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from './testing.js';

const TABLES = ['users', 'user_profiles', 'lessons', 'typing_sessions', 'key_performances', 'progress'];

describe('ADR-002/ADR-005 - Migrations do schema SQLite', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('TASK-049 - runMigrations cria todas as tabelas do schema', async () => {
    const rows = (await dataSource.query("SELECT name FROM sqlite_master WHERE type = 'table'")) as unknown as Array<{ name: string }>;
    const names = rows.map((row) => row.name);

    for (const table of TABLES) {
      expect(names).toContain(table);
    }
  });

  it('TASK-049 - chave única de KeyPerformance impede duplicata (userId, logicalKey, layout)', async () => {
    await dataSource.query(
      `INSERT INTO key_performances
        ("id", "userId", "logicalKey", "layout", "attempts", "errors", "averageLatencyMs", "consecutiveMasterySessions", "regressionSessions", "masteryState")
       VALUES ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'a', 'ABNT2', 5, 1, 200, 0, 0, 'WEAK')`
    );

    await expect(
      dataSource.query(
        `INSERT INTO key_performances
          ("id", "userId", "logicalKey", "layout", "attempts", "errors", "averageLatencyMs", "consecutiveMasterySessions", "regressionSessions", "masteryState")
         VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'a', 'ABNT2', 5, 1, 200, 0, 0, 'WEAK')`
      )
    ).rejects.toThrow();
  });

  it('TASK-049 - desfazer as migrations remove as tabelas do schema', async () => {
    let guard = 0;
    while (guard++ < 20) {
      const applied = (await dataSource.query('SELECT name FROM migrations')) as unknown as Array<{ name: string }>;
      if (applied.length === 0) {
        break;
      }
      await dataSource.undoLastMigration();
    }

    const rows = (await dataSource.query("SELECT name FROM sqlite_master WHERE type = 'table'")) as unknown as Array<{ name: string }>;
    const names = rows.map((row) => row.name);

    for (const table of TABLES) {
      expect(names).not.toContain(table);
    }
  });
});
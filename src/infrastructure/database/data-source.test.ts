import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "./testing.js";
import { createDataSource, SCHEMA_MIGRATIONS } from "./data-source.js";

const TABLES = [
  "users",
  "user_profiles",
  "lessons",
  "typing_sessions",
  "key_performances",
  "progress",
];

/** Descreve o schema resultante de uma lista de migrations, sem a tabela de bookkeeping do TypeORM. */
async function dumpSchema(useAllMigrations: boolean): Promise<string[]> {
  const dataSource = useAllMigrations
    ? createDataSource({ database: ":memory:" })
    : createDataSource({ database: ":memory:", migrations: SCHEMA_MIGRATIONS });
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: "each" });

  const rows = (await dataSource.query(
    `SELECT type, name, sql FROM sqlite_master
      WHERE name NOT LIKE 'sqlite_%' AND name != 'migrations'
      ORDER BY type, name`,
  )) as unknown as Array<{ type: string; name: string; sql: string }>;
  await dataSource.destroy();

  return rows.map((row) => `${row.type} ${row.name} :: ${row.sql}`);
}

describe("ADR-002/ADR-005 - Migrations do schema SQLite", () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("TASK-049 - runMigrations cria todas as tabelas do schema", async () => {
    const rows = (await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    )) as unknown as Array<{ name: string }>;
    const names = rows.map((row) => row.name);

    for (const table of TABLES) {
      expect(names).toContain(table);
    }
  });

  it("TASK-049 - chave única de KeyPerformance impede duplicata (userId, logicalKey, layout)", async () => {
    await dataSource.query(
      `INSERT INTO key_performances
        ("id", "userId", "logicalKey", "layout", "attempts", "errors", "averageLatencyMs", "consecutiveMasterySessions", "regressionSessions", "masteryState")
       VALUES ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'a', 'ABNT2', 5, 1, 200, 0, 0, 'WEAK')`,
    );

    await expect(
      dataSource.query(
        `INSERT INTO key_performances
          ("id", "userId", "logicalKey", "layout", "attempts", "errors", "averageLatencyMs", "consecutiveMasterySessions", "regressionSessions", "masteryState")
         VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'a', 'ABNT2', 5, 1, 200, 0, 0, 'WEAK')`,
      ),
    ).rejects.toThrow();
  });

  it("TASK-049 - desfazer as migrations remove as tabelas do schema", async () => {
    let guard = 0;
    while (guard++ < 20) {
      const applied = (await dataSource.query(
        "SELECT name FROM migrations",
      )) as unknown as Array<{ name: string }>;
      if (applied.length === 0) {
        break;
      }
      await dataSource.undoLastMigration();
    }

    const rows = (await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    )) as unknown as Array<{ name: string }>;
    const names = rows.map((row) => row.name);

    for (const table of TABLES) {
      expect(names).not.toContain(table);
    }
  });
});

describe("ADR-002/ADR-005 - paridade entre ALL_MIGRATIONS e SCHEMA_MIGRATIONS", () => {
  it("a coluna users.role existe no schema de runtime (ALL_MIGRATIONS)", async () => {
    const schema = await dumpSchema(true);
    const users = schema.find((entry) => entry.startsWith("table users "));

    expect(users).toBeDefined();
    expect(users).toContain('"role"');
  });

  it("ALL_MIGRATIONS e SCHEMA_MIGRATIONS produzem exatamente o mesmo schema", async () => {
    const fromSchema = await dumpSchema(false);
    const fromAll = await dumpSchema(true);

    expect(fromAll).toEqual(fromSchema);
  });
});

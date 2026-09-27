import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminSettingsTable1700000000013 implements MigrationInterface {
  name = "AddAdminSettingsTable1700000000013";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "admin_settings" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "macroBreakEnabled" integer NOT NULL DEFAULT 1,
        "macroLessonsThreshold" integer NOT NULL DEFAULT 3,
        "macroBreakDurationMs" integer NOT NULL DEFAULT 10800000,
        "microBlockDurationMs" integer NOT NULL DEFAULT 900000,
        "microBreakDurationMs" integer NOT NULL DEFAULT 180000,
        "updatedAt" text NOT NULL
      )`,
    );
    // Insere configuração padrão
    await queryRunner.query(
      `INSERT INTO "admin_settings" ("macroBreakEnabled", "macroLessonsThreshold", "macroBreakDurationMs", "microBlockDurationMs", "microBreakDurationMs", "updatedAt")
       VALUES (1, 3, 10800000, 900000, 180000, datetime('now'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_settings"`);
  }
}

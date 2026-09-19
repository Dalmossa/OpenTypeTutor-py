import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyMetricsAggregateTable1700000000008 implements MigrationInterface {
  name = 'AddDailyMetricsAggregateTable1700000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "daily_metrics_aggregate" (
        "userId" text NOT NULL,
        "layout" text NOT NULL,
        "date" text NOT NULL,
        "sessionsCompleted" integer NOT NULL DEFAULT 0,
        "totalActiveMs" integer NOT NULL DEFAULT 0,
        "totalGrossChars" integer NOT NULL DEFAULT 0,
        "totalCorrectChars" integer NOT NULL DEFAULT 0,
        "totalErrors" integer NOT NULL DEFAULT 0,
        "totalLatencyMs" integer NOT NULL DEFAULT 0,
        "totalLatencySamples" integer NOT NULL DEFAULT 0,
        "keysPracticed" text NOT NULL DEFAULT '[]',
        PRIMARY KEY ("userId", "layout", "date")
      )`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_metrics_aggregate"`);
  }
}
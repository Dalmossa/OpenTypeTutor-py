import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgressCardTable1700000000006 implements MigrationInterface {
  name = 'AddProgressCardTable1700000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "progress_cards" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "date" text NOT NULL,
        "phase" text NOT NULL,
        "lessonNumber" integer NOT NULL,
        "insecureKeys" text NOT NULL,
        "discomfortReported" boolean NOT NULL,
        "discomfortDetail" text,
        "nextSessionNote" text NOT NULL,
        "previousBackspaceCount" integer NOT NULL,
        "currentBackspaceCount" integer NOT NULL
      )`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_progress_cards_userId" ON "progress_cards" ("userId")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "progress_cards"`);
  }
}
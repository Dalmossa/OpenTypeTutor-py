import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeyMasteryTransitionTable17000000000010 implements MigrationInterface {
  name = 'AddKeyMasteryTransitionTable17000000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "key_mastery_transition" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "userId" text NOT NULL,
        "logicalKey" text NOT NULL,
        "layout" text NOT NULL,
        "date" text NOT NULL,
        "from" text NOT NULL,
        "to" text NOT NULL
      )`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kmx_user_date" ON "key_mastery_transition" ("userId", "date")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "key_mastery_transition"`);
  }
}
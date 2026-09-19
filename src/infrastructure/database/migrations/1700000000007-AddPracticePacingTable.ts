import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPracticePacingTable1700000000007 implements MigrationInterface {
  name = 'AddPracticePacingTable1700000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "practice_pacing" (
        "userId" text PRIMARY KEY NOT NULL,
        "accumulatedActiveMs" integer NOT NULL,
        "lastSessionEndedAt" text
      )`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "practice_pacing"`);
  }
}
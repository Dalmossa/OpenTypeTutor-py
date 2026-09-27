import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetTokenTable1700000000014 implements MigrationInterface {
  name = "AddPasswordResetTokenTable1700000000014";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "tokenHash" text NOT NULL,
        "expiresAt" text NOT NULL,
        "usedAt" text,
        "createdAt" text NOT NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_expiresAt" ON "password_reset_tokens" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}

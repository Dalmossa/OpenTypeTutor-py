import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleColumn1700000000015 implements MigrationInterface {
  name = "AddUserRoleColumn1700000000015";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'user'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}

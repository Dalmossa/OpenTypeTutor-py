import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardFields1700000000009 implements MigrationInterface {
  name = 'AddDashboardFields1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN "timezone" text NOT NULL DEFAULT 'America/Sao_Paulo'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "timezone"`);
  }
}
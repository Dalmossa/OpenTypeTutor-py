import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPedagogicalPhaseColumns1700000000004 implements MigrationInterface {
  name = 'AddPedagogicalPhaseColumns1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD COLUMN "pedagogicalPhase" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD COLUMN "lessonInPhase" integer`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lessons" DROP COLUMN "pedagogicalPhase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" DROP COLUMN "lessonInPhase"`,
    );
  }
}
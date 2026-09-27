import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMacroBreakColumns1700000000012 implements MigrationInterface {
  name = "AddMacroBreakColumns1700000000012";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "practice_pacing" ADD COLUMN "completedLessonsSinceMacroBreak" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "practice_pacing" ADD COLUMN "macroBreakEndsAt" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "practice_pacing" DROP COLUMN "completedLessonsSinceMacroBreak"`,
    );
    await queryRunner.query(
      `ALTER TABLE "practice_pacing" DROP COLUMN "macroBreakEndsAt"`,
    );
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { SEED_PEDAGOGICAL_CURRICULUM } from '../seed/pedagogicalCurriculum.js';

export class SeedPedagogicalCurriculum1700000000005 implements MigrationInterface {
  name = 'SeedPedagogicalCurriculum1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "lessons"
          ("id", "level", "title", "content", "targetKeys", "difficulty", "type", "layout", "pedagogicalPhase", "lessonInPhase")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lesson.id,
          lesson.level,
          lesson.title,
          lesson.content,
          JSON.stringify(lesson.targetKeys),
          lesson.difficulty,
          lesson.type,
          lesson.layout,
          lesson.pedagogicalPhase,
          lesson.lessonInPhase,
        ],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ids = SEED_PEDAGOGICAL_CURRICULUM.map(l => l.id);
    const placeholders = ids.map(() => '?').join(', ');
    await queryRunner.query(
      `DELETE FROM "lessons" WHERE "id" IN (${placeholders})`,
      ids,
    );
  }
}
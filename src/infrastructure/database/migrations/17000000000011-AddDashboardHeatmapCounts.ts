import type { MigrationInterface, QueryRunner } from 'typeorm';

// RN34 - contagem de acionamentos por tecla do mapa de calor do dashboard (heatmap 7 dias)
export class AddDashboardHeatmapCounts17000000000011 implements MigrationInterface {
  name = 'AddDashboardHeatmapCounts17000000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_metrics_aggregate" ADD COLUMN "keyCounts" text NOT NULL DEFAULT '{}'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "daily_metrics_aggregate" DROP COLUMN "keyCounts"`);
  }
}
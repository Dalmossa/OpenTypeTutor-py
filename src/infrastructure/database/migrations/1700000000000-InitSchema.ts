import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = [
  `CREATE TABLE "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" text NOT NULL,
    CONSTRAINT "UQ_users_email" UNIQUE ("email")
  )`,
  `CREATE TABLE "user_profiles" (
    "userId" text PRIMARY KEY NOT NULL,
    "activeLayout" text NOT NULL,
    "currentLevel" integer NOT NULL
  )`,
  `CREATE TABLE "lessons" (
    "id" text PRIMARY KEY NOT NULL,
    "level" integer NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "targetKeys" text NOT NULL,
    "difficulty" text NOT NULL,
    "type" text NOT NULL,
    "layout" text NOT NULL
  )`,
  `CREATE TABLE "typing_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "lessonId" text NOT NULL,
    "layout" text NOT NULL,
    "state" text NOT NULL,
    "startedAt" text,
    "completedAt" text,
    "activeDurationMs" integer NOT NULL,
    "metrics" text,
    "keystrokes" text NOT NULL,
    "pausedAt" text,
    "totalPausedDurationMs" integer NOT NULL
  )`,
  `CREATE TABLE "key_performances" (
    "id" text PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "logicalKey" text NOT NULL,
    "layout" text NOT NULL,
    "attempts" integer NOT NULL,
    "errors" integer NOT NULL,
    "averageLatencyMs" integer NOT NULL,
    "lastPracticedAt" text,
    "consecutiveMasterySessions" integer NOT NULL,
    "regressionSessions" integer NOT NULL,
    "masteryState" text NOT NULL,
    CONSTRAINT "UQ_key_performances_user_logicalKey_layout" UNIQUE ("userId", "logicalKey", "layout")
  )`,
  `CREATE TABLE "progress" (
    "id" text PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "currentLessonId" text NOT NULL,
    "currentLevel" integer NOT NULL,
    "completedLessons" integer NOT NULL,
    "lastCompletedAt" text,
    CONSTRAINT "UQ_progress_userId" UNIQUE ("userId")
  )`,
  `CREATE INDEX "IDX_typing_sessions_userId" ON "typing_sessions" ("userId")`,
];

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TABLES) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['key_performances', 'progress', 'typing_sessions', 'lessons', 'user_profiles', 'users']) {
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
  }
}
#!/usr/bin/env tsx

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { Lesson } from "../src/domain/entities/Lesson.js";
import { ProgressCard } from "../src/domain/entities/ProgressCard.js";
import { PedagogicalProgressionEngine } from "../src/domain/services/PedagogicalProgressionEngine.js";
import { Layout } from "../src/domain/value-objects/Layout.js";
import { PedagogicalPhase } from "../src/domain/value-objects/PedagogicalPhase.js";
import { SessionId } from "../src/domain/value-objects/SessionId.js";

const DB_PATH = process.env["DB_PATH"] ?? "./data/opentype.sqlite";
const APPLY = process.argv.includes("--apply");

interface LessonInfo {
  id: string;
  phase: PedagogicalPhase;
  lessonInPhase: number;
  title: string;
}

interface FrontierPosition extends LessonInfo {}

function loadLessons(db: InstanceType<typeof Database>): Lesson[] {
  const rows = db
    .prepare(
      `SELECT id, level, title, content, targetKeys, difficulty, type, layout,
              pedagogicalPhase, lessonInPhase
         FROM lessons`,
    )
    .all() as {
    id: string;
    level: number;
    title: string;
    content: string;
    targetKeys: string;
    difficulty: string;
    type: string;
    layout: string;
    pedagogicalPhase: string | null;
    lessonInPhase: number | null;
  }[];

  return rows
    .filter((r) => r.pedagogicalPhase !== null && r.lessonInPhase !== null)
    .map((r) =>
      Lesson.create({
        id: SessionId.create(r.id),
        level: r.level,
        title: r.title,
        content: r.content,
        targetKeys: safeJsonArray(r.targetKeys),
        difficulty: r.difficulty as Lesson["difficulty"],
        type: r.type as Lesson["type"],
        layout: Layout.create(r.layout),
        pedagogicalPhase: PedagogicalPhase.create(r.pedagogicalPhase as string),
        lessonInPhase: r.lessonInPhase as number,
      }),
    );
}

function safeJsonArray(value: string | null): string[] {
  if (value === null || value === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function countBackspaces(keystrokes: string | null): number {
  if (keystrokes === null || keystrokes === "") {
    return 0;
  }
  try {
    const events = JSON.parse(keystrokes) as { eventType?: string }[];
    return Array.isArray(events)
      ? events.filter((e) => e.eventType === "CORRECTION").length
      : 0;
  } catch {
    return 0;
  }
}

function cardFor(
  position: FrontierPosition,
  currentBackspaceCount: number,
): ProgressCard {
  return ProgressCard.create({
    userId: SessionId.create(position.id),
    date: new Date(),
    phase: position.phase,
    lessonNumber: position.lessonInPhase,
    insecureKeys: [],
    discomfortReported: false,
    nextSessionNote: "",
    previousBackspaceCount: currentBackspaceCount,
    currentBackspaceCount,
  });
}

interface UserReport {
  userId: string;
  oldCard: { phase: string; lessonNumber: number } | null;
  newCard: {
    phase: string;
    lessonNumber: number;
    lessonId: string;
    title: string;
    backspaces: number;
  } | null;
  advanced: number;
  reviewsSkipped: number;
  insufficientSkipped: number;
  criteriaFailed: number;
  notResolved: number;
}

function reconcileUser(
  db: InstanceType<typeof Database>,
  userId: string,
  engine: PedagogicalProgressionEngine,
  lessonsById: Map<string, LessonInfo>,
): UserReport {
  const oldRow = db
    .prepare(
      `SELECT phase, lessonNumber FROM progress_cards WHERE userId = ? ORDER BY date DESC LIMIT 1`,
    )
    .get(userId) as { phase: string; lessonNumber: number } | undefined;
  const oldCard =
    oldRow !== undefined
      ? { phase: oldRow.phase, lessonNumber: oldRow.lessonNumber }
      : null;

  const sessions = db
    .prepare(
      `SELECT id, lessonId, completedAt, activeDurationMs, metrics, keystrokes
         FROM typing_sessions
        WHERE userId = ? AND state = 'COMPLETED' AND completedAt IS NOT NULL
        ORDER BY CAST(completedAt AS TEXT) ASC, id ASC`,
    )
    .all(userId) as {
    id: string;
    lessonId: string | null;
    completedAt: string | null;
    activeDurationMs: number | null;
    metrics: string | null;
    keystrokes: string | null;
  }[];

  const first = engine.getFirstLessonOfPhase(
    PedagogicalPhase.create("ERGONOMICS_SETUP"),
  );
  let position: FrontierPosition | null = null;
  let bFrontier = 0;

  const report: UserReport = {
    userId,
    oldCard,
    newCard: null,
    advanced: 0,
    reviewsSkipped: 0,
    insufficientSkipped: 0,
    criteriaFailed: 0,
    notResolved: 0,
  };

  for (const s of sessions) {
    const info = s.lessonId !== null ? lessonsById.get(s.lessonId) : undefined;
    if (info === undefined) {
      report.notResolved += 1;
      continue;
    }

    const expected: Lesson | null =
      position === null
        ? first
        : engine.getNextLesson(cardFor(position, bFrontier), true).lesson;

    if (expected === null) {
      report.reviewsSkipped += 1;
      continue;
    }
    if (expected.id.value !== info.id) {
      report.reviewsSkipped += 1;
      continue;
    }

    const metrics =
      s.metrics !== null
        ? (JSON.parse(s.metrics) as { charactersTyped?: number })
        : {};
    const charactersTyped = metrics.charactersTyped ?? 0;
    if ((s.activeDurationMs ?? 0) < 3000 || charactersTyped < 5) {
      report.insufficientSkipped += 1;
      continue;
    }

    const backspaces = countBackspaces(s.keystrokes);
    const previous = bFrontier;
    bFrontier = backspaces;
    if (backspaces <= previous) {
      position = {
        id: info.id,
        phase: info.phase,
        lessonInPhase: info.lessonInPhase,
        title: info.title,
      };
      report.advanced += 1;
    } else {
      report.criteriaFailed += 1;
    }
  }

  if (position !== null) {
    report.newCard = {
      phase: position.phase.value,
      lessonNumber: position.lessonInPhase,
      lessonId: position.id,
      title: position.title,
      backspaces: bFrontier,
    };
  }

  return report;
}

function main(): void {
  const db = new Database(DB_PATH);
  const lessons = loadLessons(db);
  const engine = new PedagogicalProgressionEngine(lessons);
  const lessonsById = new Map<string, LessonInfo>();
  for (const lesson of lessons) {
    if (lesson.pedagogicalPhase !== null && lesson.lessonInPhase !== null) {
      lessonsById.set(lesson.id.value, {
        id: lesson.id.value,
        phase: lesson.pedagogicalPhase,
        lessonInPhase: lesson.lessonInPhase,
        title: lesson.title,
      });
    }
  }

  const users = db
    .prepare(
      `SELECT userId FROM progress_cards UNION SELECT DISTINCT userId FROM typing_sessions`,
    )
    .all() as { userId: string }[];

  console.log(
    `db: ${DB_PATH}  |  lessons pedagógicas: ${lessonsById.size}  |  usuários: ${users.length}`,
  );
  console.log(
    `modo: ${APPLY ? "APLICAR (--apply)" : "DRY-RUN (sem escrita; use --apply para aplicar)"}`,
  );
  console.log("");

  db.transaction(() => {
    let cardsWritten = 0;
    for (const { userId } of users) {
      const report = reconcileUser(db, userId, engine, lessonsById);
      const oldPosition =
        report.oldCard !== null
          ? `${report.oldCard.phase} #${String(report.oldCard.lessonNumber)}`
          : "(sem cartão)";
      const newPosition =
        report.newCard !== null
          ? `${report.newCard.phase} #${String(report.newCard.lessonNumber)} (${report.newCard.lessonId}) — ${report.newCard.title}`
          : "(resetar: fronteira não alcançada)";

      console.log(`usuário ${userId.slice(0, 8)}...`);
      console.log(`  cartão atual      : ${oldPosition}`);
      console.log(`  fronteira correta : ${newPosition}`);
      console.log(
        `  sessões: avanço=${report.advanced} revisão-ignorada=${report.reviewsSkipped} insuficiente=${report.insufficientSkipped} critério-falhou=${report.criteriaFailed} sem-lição=${report.notResolved}`,
      );

      if (APPLY) {
        db.prepare("DELETE FROM progress_cards WHERE userId = ?").run(userId);
        if (report.newCard !== null) {
          db.prepare(
            `INSERT INTO progress_cards
               (id, userId, date, phase, lessonNumber, insecureKeys, discomfortReported,
                discomfortDetail, nextSessionNote, previousBackspaceCount, currentBackspaceCount)
             VALUES (?, ?, ?, ?, ?, '[]', 0, NULL, ?, 0, ?)`,
          ).run(
            randomUUID(),
            userId,
            new Date().toISOString(),
            report.newCard.phase,
            report.newCard.lessonNumber,
            `Fronteira recalculada (TASK-108). Próxima lição: ${report.newCard.title}`,
            report.newCard.backspaces,
          );
          cardsWritten += 1;
        }
      }
      console.log("");
    }
    console.log(
      APPLY
        ? `Aplicado: ${cardsWritten} cartões-âncora gravados (cartões antigos substituídos).`
        : "DRY-RUN: nenhuma escrita. Revise o relatório e rode com --apply para aplicar.",
    );
  })();

  db.close();
}

main();

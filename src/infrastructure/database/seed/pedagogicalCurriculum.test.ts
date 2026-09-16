import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { SEED_PEDAGOGICAL_CURRICULUM, type SeedPedagogicalLesson } from './pedagogicalCurriculum.js';
import { createSeededTestDataSource } from '../testing.js';
import { Lesson } from '../../../domain/entities/Lesson.js';
import { SessionId } from '../../../domain/value-objects/SessionId.js';
import { Layout } from '../../../domain/value-objects/Layout.js';
import { PedagogicalPhase } from '../../../domain/value-objects/PedagogicalPhase.js';
import { ProgressCard } from '../../../domain/entities/ProgressCard.js';
import { PedagogicalProgressionEngine } from '../../../domain/services/PedagogicalProgressionEngine.js';
import { VALID_PHASE_ORDER, PHASE_EXPECTED_COUNT, TOTAL_LESSONS } from './pedagogicalCurriculum.js';

function toLesson(seed: SeedPedagogicalLesson): Lesson {
  return Lesson.create({
    id: SessionId.create(seed.id),
    level: seed.level,
    title: seed.title,
    content: seed.content,
    targetKeys: seed.targetKeys,
    difficulty: seed.difficulty,
    type: seed.type,
    layout: Layout.create(seed.layout),
    pedagogicalPhase: PedagogicalPhase.create(seed.pedagogicalPhase),
    lessonInPhase: seed.lessonInPhase,
  });
}

describe('TASK-033f - Seed do currículo pedagógico (Curso-Digitacao.md)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createSeededTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('TASK-033f - RN25 - contém exatamente 80 lições nas 7 fases (1/10/20/20/20/7/2)', () => {
    expect(SEED_PEDAGOGICAL_CURRICULUM).toHaveLength(TOTAL_LESSONS);

    const byPhase = new Map<string, number>();
    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      byPhase.set(lesson.pedagogicalPhase, (byPhase.get(lesson.pedagogicalPhase) ?? 0) + 1);
    }

    for (const [phase, count] of Object.entries(PHASE_EXPECTED_COUNT)) {
      expect(byPhase.get(phase)).toBe(count);
    }

    for (const phase of VALID_PHASE_ORDER) {
      expect(byPhase.get(phase) ?? 0).toBeGreaterThan(0);
    }
  });

  it('TASK-033f - RN25 - lessonInPhase é sequencial (1..n) sem lacunas nem duplicatas por fase', () => {
    const seen = new Map<string, Set<number>>();

    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      if (!seen.has(lesson.pedagogicalPhase)) {
        seen.set(lesson.pedagogicalPhase, new Set());
      }
      const numbers = seen.get(lesson.pedagogicalPhase);
      if (numbers) {
        numbers.add(lesson.lessonInPhase);
      }
    }

    for (const [phase, expectedMax] of Object.entries(PHASE_EXPECTED_COUNT)) {
      const numbers = seen.get(phase);
      expect(numbers).toBeDefined();
      if (!numbers) {
        continue;
      }
      for (let n = 1; n <= expectedMax; n++) {
        expect(numbers.has(n), `Fase ${phase} deve ter lição ${String(n)}`).toBe(true);
      }
      expect(numbers.size).toBe(expectedMax);
    }
  });

  it('TASK-033f - RN25 - todas as lições são ABNT2 com conteúdo e chaves alvo válidas', () => {
    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      expect(lesson.layout).toBe('ABNT2');
      expect(lesson.content.trim().length).toBeGreaterThan(0);
      expect(lesson.targetKeys.length).toBeGreaterThan(0);

      const contentChars = new Set(lesson.content.toLowerCase().split(''));
      contentChars.delete(' ');
      contentChars.delete('\n');
      for (const key of lesson.targetKeys) {
        expect(contentChars.has(key), `Chave alvo '${key}' ausente no conteúdo de ${lesson.title}`).toBe(true);
      }
    }
  });

  it('TASK-033f - RN25 - IDs determinísticos, únicos e dentro do range previsível', () => {
    const ids = SEED_PEDAGOGICAL_CURRICULUM.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      expect(lesson.id).toMatch(/^3bab2b40-0000-4000-8000-\d{12}$/);
    }
  });

  it('TASK-033f - RN25 - lições constroem Lesson válida com fase e número', () => {
    for (const lesson of SEED_PEDAGOGICAL_CURRICULUM) {
      const domain = toLesson(lesson);
      expect(domain.pedagogicalPhase?.value).toBe(lesson.pedagogicalPhase);
      expect(domain.lessonInPhase).toBe(lesson.lessonInPhase);
    }
  });

  it('TASK-033f - RN25 - migration persiste as 80 lições com colunas pedagógicas', async () => {
    const rows = (await dataSource.query(
      `SELECT COUNT(*) AS total FROM lessons WHERE "pedagogicalPhase" IS NOT NULL`
    )) as unknown as Array<{ total: number }>;
    expect(rows[0]?.total).toBe(TOTAL_LESSONS);
  });

  it('TASK-033f - RN25 - PedagogicalProgressionEngine percorre o currículo completo até complete sem no_lessons', () => {
    const lessons = SEED_PEDAGOGICAL_CURRICULUM.map(toLesson);
    const engine = new PedagogicalProgressionEngine(lessons);

    for (const phase of VALID_PHASE_ORDER) {
      const p = PedagogicalPhase.create(phase);
      expect(engine.hasLessonsForPhase(p)).toBe(true);
      expect(engine.getLessonsForPhase(p)).toHaveLength(PHASE_EXPECTED_COUNT[phase]);
    }

    let current = ProgressCard.createInitial(SessionId.create('550e8400-e29b-41d4-a716-446655440099'));
    const producedIds = new Set<string>();

    const first = engine.getLessonByPhaseAndNumber(current.phase, current.lessonNumber);
    if (first) {
      producedIds.add(first.id.value);
    }

    for (let i = 0; i < 200; i++) {
      const result = engine.getNextLesson(current, true);

      if (result.reason === 'complete') {
        break;
      }

      expect(result.reason).not.toBe('no_lessons');
      expect(result.lesson).not.toBeNull();

      const next = result.lesson;
      if (next) {
        producedIds.add(next.id.value);
        current = current.advanceLesson(
          next.lessonInPhase ?? 1,
          next.pedagogicalPhase ?? PedagogicalPhase.create('HOME_ROW'),
          0,
          [],
          'continua para a próxima lição'
        );
      }
    }

    expect(producedIds.size).toBe(TOTAL_LESSONS);
  });
});
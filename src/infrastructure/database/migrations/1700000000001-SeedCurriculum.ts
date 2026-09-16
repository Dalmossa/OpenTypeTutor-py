import type { MigrationInterface, QueryRunner } from 'typeorm';

type SeedLesson = {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: 'GUIDED' | 'REINFORCEMENT' | 'FREE';
  type: 'INTRODUCTION' | 'PRACTICE' | 'REINFORCEMENT' | 'ASSESSMENT';
  layout: string;
};

const EXISTING_LESSON_ID = '15b10069-bf2c-4258-ab56-5e6e0caeb587';

const CURRICULUM: SeedLesson[] = [
  {
    id: '1b9d2b40-0000-4000-8000-000000000001',
    level: 1,
    title: 'Introdução: teclas F e J',
    content: 'fff jjj fjf jfj fff jjj jfj fjf',
    targetKeys: ['f', 'j'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000002',
    level: 1,
    title: 'Introdução: teclas D e K',
    content: 'ddd kkk dkd kdk ddd kkk kdk dkd',
    targetKeys: ['d', 'k'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000003',
    level: 1,
    title: 'Introdução: linha guia completa',
    content: 'fff jjj ddd kkk sss aaa lll fdsa asdf jkl lkj',
    targetKeys: ['f', 'j', 'd', 'k', 's', 'a', 'l'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: EXISTING_LESSON_ID,
    level: 1,
    title: 'Linha guia básica',
    content: 'fff jjj ddd kkk sss aaa eee ooo',
    targetKeys: ['f', 'j', 'd', 'k', 's', 'a', 'e', 'o'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000005',
    level: 1,
    title: 'Prática: linha superior e inferior',
    content: 'qqq www eee rrr ttt yyy uuu iii ooo ppp zzz xxx ccc vvv bbb nnn mmm',
    targetKeys: [
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'z', 'x', 'c', 'v', 'b', 'n', 'm',
    ],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000006',
    level: 1,
    title: 'Prática mista nível 1',
    content: 'asdf jkl fdsa fghj tyui vbnm opio qwer zxcv',
    targetKeys: [
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'z', 'x', 'c', 'v', 'b', 'n', 'm',
    ],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000007',
    level: 1,
    title: 'Avaliação A: linha guia',
    content: 'asdf fdsa jkl lkj asdf fdsa jkl lkj asdf jkl',
    targetKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000008',
    level: 1,
    title: 'Avaliação B: toque geral',
    content: 'o tempo voa e o rato roeu a roupa do rei',
    targetKeys: ['a', 'd', 'e', 'i', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000009',
    level: 1,
    title: 'Avaliação C: conclusão',
    content: 'a pratica leva a perfeicao e a paciencia vence o dia',
    targetKeys: ['a', 'c', 'd', 'e', 'f', 'i', 'l', 'n', 'o', 'p', 'r', 't', 'u', 'v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
];

export class SeedCurriculum1700000000001 implements MigrationInterface {
  name = 'SeedCurriculum1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const lesson of CURRICULUM) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "lessons" ("id", "level", "title", "content", "targetKeys", "difficulty", "type", "layout")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lesson.id,
          lesson.level,
          lesson.title,
          lesson.content,
          JSON.stringify(lesson.targetKeys),
          lesson.difficulty,
          lesson.type,
          lesson.layout,
        ],
      );
    }

    const existing = CURRICULUM.find(lesson => lesson.id === EXISTING_LESSON_ID);
    if (existing !== undefined) {
      await queryRunner.query(
        `UPDATE "lessons" SET "title" = ? WHERE "id" = ?`,
        [existing.title, EXISTING_LESSON_ID],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ids = CURRICULUM.map(lesson => lesson.id);
    await queryRunner.query(
      `DELETE FROM "lessons" WHERE "id" IN (${ids.map(() => '?').join(', ')})`,
      ids,
    );
  }
}
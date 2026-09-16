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

const CURRICULUM: SeedLesson[] = [
  {
    id: '2b9d2b40-0000-4000-8000-000000000010',
    level: 1,
    title: 'Introdução ao teclado ABNT',
    content: 'Este módulo apresenta o teclado ABNT e a posição das mãos. Pratique a linha guia com as teclas base: f j d k s a l.',
    targetKeys: ['f', 'j', 'd', 'k', 's', 'a', 'l'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '2b9d2b40-0000-4000-8000-000000000011',
    level: 1,
    title: 'Prática: linha guia e top row',
    content: 'fff jjj ddd kkk sss aaa lll fdsa asdf jkl lkj',
    targetKeys: ['f', 'j', 'd', 'k', 's', 'a', 'l'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '2b9d2b40-0000-4000-8000-000000000012',
    level: 1,
    title: 'Prática: linha superior e inferior',
    content: 'qqq www eee rrr ttt yyy uuu iii ooo ppp zzz xxx ccc vvv bbb nnn mmm',
    targetKeys: [
      'q','w','e','r','t','y','u','i','o','p',
      'z','x','c','v','b','n','m'
    ],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '2b9d2b40-0000-4000-8000-000000000013',
    level: 1,
    title: 'Avaliação: conclusão',
    content: 'A prática leva à perfeição e a paciência vence o dia.',
    targetKeys: ['a','c','d','e','f','i','l','n','o','p','r','t','u','v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
];

export class SeedCursoDigitacao1700000000003 implements MigrationInterface {
  name = 'SeedCursoDigitacao1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const lesson of CURRICULUM) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "lessons" ("id", "level", "title", "content", "targetKeys", "difficulty", "type", "layout") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ids = CURRICULUM.map(l => l.id);
    await queryRunner.query(
      `DELETE FROM "lessons" WHERE "id" IN (${ids.map(() => '?').join(', ')})`,
      ids,
    );
  }
}

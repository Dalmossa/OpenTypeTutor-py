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
    id: '1b9d2b40-0000-4000-8000-000000000010',
    level: 2,
    title: 'Introdução: teclas D e K',
    content: 'ddd kkk dkd kdk ddd kkk kdk dkd',
    targetKeys: ['d', 'k'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000011',
    level: 2,
    title: 'Introdução: teclas S e A',
    content: 'sss aaa sas asa sss aaa asa sas',
    targetKeys: ['s', 'a'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000012',
    level: 2,
    title: 'Prática: linha guia completa',
    content: 'fff jjj ddd kkk sss aaa lll ;;; fdsa asdf jkl; ;lkj',
    targetKeys: ['f', 'j', 'd', 'k', 's', 'a', 'l', ';'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000013',
    level: 2,
    title: 'Prática: linha superior',
    content: 'qqq www eee rrr ttt yyy uuu iii ooo ppp qwer tyui opio',
    targetKeys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000014',
    level: 2,
    title: 'Prática: linha inferior',
    content: 'zzz xxx ccc vvv bbb nnn mmm ,,, ... zxcv bnm, vbnm',
    targetKeys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000015',
    level: 2,
    title: 'Avaliação A: linha guia dominada',
    content: 'asdf fdsa jkl; ;lkj asdf fdsa jkl; ;lkj asdf jkl;',
    targetKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000016',
    level: 2,
    title: 'Avaliação B: toque geral nivel 2',
    content: 'o tempo voa e o rato roeu a roupa do rei de roma',
    targetKeys: ['a', 'd', 'e', 'i', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000017',
    level: 2,
    title: 'Avaliação C: conclusao nivel 2',
    content: 'a pratica leva a perfeicao e a paciencia vence o dia sempre',
    targetKeys: ['a', 'c', 'd', 'e', 'f', 'i', 'l', 'n', 'o', 'p', 'r', 't', 'u', 'v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000018',
    level: 3,
    title: 'Introducao: pontuacao e acentos',
    content: 'ccc vvv bbb nnn mmm ,,, ... ;; :: ?? !! aa ee ii oo uu',
    targetKeys: [',', '.', ';', ':', '?', '!', 'a', 'e', 'i', 'o', 'u'],
    difficulty: 'GUIDED',
    type: 'INTRODUCTION',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000019',
    level: 3,
    title: 'Prática: frases curtas',
    content: 'o rato roeu a roupa do rei de roma o cao ladra o gato mia',
    targetKeys: ['a', 'c', 'd', 'e', 'g', 'i', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000020',
    level: 3,
    title: 'Prática: velocidade e precisão',
    content: 'asdf jkl; qwer uiop zxcv bnm, asdf jkl; qwer uiop zxcv bnm',
    targetKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'q', 'w', 'e', 'r', 'u', 'i', 'o', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ','],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000021',
    level: 3,
    title: 'Avaliação A: toque completo',
    content: 'a pratica leva a perfeicao a paciencia vence o dia a constancia supera o talento',
    targetKeys: ['a', 'c', 'd', 'e', 'f', 'i', 'l', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000022',
    level: 3,
    title: 'Avaliação B: texto corrido',
    content: 'quem constroi devagar raramente precisa reconstruir do zero a disciplina e a ponte entre a intencao e o resultado',
    targetKeys: ['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'z'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
  {
    id: '1b9d2b40-0000-4000-8000-000000000023',
    level: 3,
    title: 'Avaliação C: conclusao nivel 3',
    content: 'cada repeticao consciente vale mais do que dez feitas no automatico o caminho fica mais claro para quem ja deu o proximo passo',
    targetKeys: ['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'z'],
    difficulty: 'FREE',
    type: 'ASSESSMENT',
    layout: 'ABNT2',
  },
];

export class SeedCurriculumLevels2and31700000000002 implements MigrationInterface {
  name = 'SeedCurriculumLevels2and31700000000002';

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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ids = CURRICULUM.map(lesson => lesson.id);
    await queryRunner.query(
      `DELETE FROM "lessons" WHERE "id" IN (${ids.map(() => '?').join(', ')})`,
      ids,
    );
  }
}
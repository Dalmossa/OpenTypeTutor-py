import type { LessonDifficulty, LessonType } from '../../../domain/entities/Lesson.js';

export type SeedPedagogicalLesson = {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: LessonDifficulty;
  type: LessonType;
  layout: 'ABNT2';
  pedagogicalPhase: string;
  lessonInPhase: number;
};

const id = (n: number): string => `3bab2b40-0000-4000-8000-${String(n).padStart(12, '0')}`;

const keys = (content: string): string[] => {
  const distinct = new Set<string>();
  for (const ch of content.toLowerCase()) {
    if (ch !== ' ' && ch !== '\n') {
      distinct.add(ch);
    }
  }
  return [...distinct];
};

const drill = (unit: string, perLine = 10, lines = 3): string =>
  Array.from({ length: lines }, () => Array.from({ length: perLine }, () => unit).join(' ')).join('\n');

export const VALID_PHASE_ORDER = [
  'ERGONOMICS_SETUP',
  'HOME_ROW',
  'UPPER_LOWER_ROWS',
  'WORD_FIXATION',
  'ACCENTUATION',
  'LONG_TEXTS',
  'NUMERIC_KEYPAD',
] as const;

export const PHASE_EXPECTED_COUNT: Record<(typeof VALID_PHASE_ORDER)[number], number> = {
  ERGONOMICS_SETUP: 1,
  HOME_ROW: 10,
  UPPER_LOWER_ROWS: 20,
  WORD_FIXATION: 20,
  ACCENTUATION: 20,
  LONG_TEXTS: 7,
  NUMERIC_KEYPAD: 2,
};

export const TOTAL_LESSONS = 80;

const ERGONOMICS_CONTENT = drill('asdfg jklç', 5, 4);

const ergonomicsLesson: SeedPedagogicalLesson = {
  id: id(1),
  level: 1,
  title: 'Check-in ergonômico e posicionamento das mãos',
  content: ERGONOMICS_CONTENT,
  targetKeys: keys(ERGONOMICS_CONTENT),
  difficulty: 'GUIDED',
  type: 'INTRODUCTION',
  layout: 'ABNT2',
  pedagogicalPhase: 'ERGONOMICS_SETUP',
  lessonInPhase: 1,
};

const HOME_ROW_UNITS = [
  'asdfg',
  'hjklç',
  'gfdsa',
  'çlkjh',
  'asdfghjklç',
  'çlkjhgfdsa',
  'gfdsaçlkjh',
  'hjklçasdfg',
  'açsldkfjgh',
  'ghfjdkslaç',
];

const homeRow: SeedPedagogicalLesson[] = HOME_ROW_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 2),
    level: 1,
    title: `Lição ${String(i + 1)} — linha guia (${unit})`,
    content: drill(unit),
    targetKeys: keys(drill(unit)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'HOME_ROW',
    lessonInPhase: i + 1,
  })
);

const UPPER_LOWER_UNITS = [
  'qwert',
  'yuiop',
  'trewq',
  'poiuy',
  'qwertyuiop',
  'poiuytrewq',
  'trewqpoiuy',
  'yuiopqwert',
  'qpwoeiruty',
  'tyrueiwoqp',
  '\\zxcvb',
  'nm,.;/',
  'bvcx\\',
  '/;.,mn',
  '\\zxcvbnm,.;/',
  '/;.,mnbvcxz\\',
  'bvcxz\\/;.,mn',
  'nm,.;/\\zxcvb',
  '\\/z;x.c,vmbn',
  'bnvmc,x.z;\\/',
];

const upperLower: SeedPedagogicalLesson[] = UPPER_LOWER_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 12),
    level: 1,
    title: `Lição ${String(i + 11)} — fileiras superior e inferior (${unit})`,
    content: drill(unit),
    targetKeys: keys(drill(unit)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'UPPER_LOWER_ROWS',
    lessonInPhase: i + 1,
  })
);

const WORD_FIXATION_UNITS = [
  'assa sala',
  'dada fada',
  'gaga haja',
  'assada sal',
  'salsa fala',
  'falsa galga',
  'gala salgada',
  'saldada halda',
  'salada faladas',
  'kada daka',
  'querer quito',
  'quoque reto',
  'trote topo',
  'pote reitero',
  'requeiro ter',
  'ara arara',
  'arado lia',
  'polir juqueri',
  'sua quatro',
  'cabana pote',
];

const wordFixation: SeedPedagogicalLesson[] = WORD_FIXATION_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 32),
    level: 1,
    title: `Lição ${String(i + 1)} — fixação de palavras (${unit})`,
    content: drill(unit, 5, 5),
    targetKeys: keys(drill(unit, 5, 5)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'WORD_FIXATION',
    lessonInPhase: i + 1,
  })
);

const ACCENTUATION_UNITS = [
  'idéia é',
  'só fúria',
  'avô tânia',
  'câmbio ânsia',
  'pão mão',
  'sã manhã',
  'à fé',
  'Titã químico',
  'álcool éter',
  'porém pé',
  'Ao homem foi dado o raciocínio.',
  'Vimos pela presente solicitar.',
  'Venho respeitosamente à presença de V. Exa.',
  'O homem torna-se tudo ou nada conforme a educação que recebe.',
  'Só um povo instruído pode tornar-se livre.',
  'O povo que tiver as melhores escolas será o primeiro do mundo.',
  'O amor ao estudo é um presente do céu.',
  'Ao ensejo, apresento-lhe as minhas cordiais saudações.',
  'Sem mais para o momento, subscrevo-me cordialmente.',
  'José Bonifácio, o Patriarca da Independência.',
];

const accentuation: SeedPedagogicalLesson[] = ACCENTUATION_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 52),
    level: 1,
    title: `Fase ${String(i + 1)} — acentuação (${unit})`,
    content: drill(unit, 5, 5),
    targetKeys: keys(drill(unit, 5, 5)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'ACCENTUATION',
    lessonInPhase: i + 1,
  })
);

const ABOIO_TEXT =
  'Ainda retiniam as últimas badaladas das trindades, quando longe, pela várzea além, começaram a ' +
  'arranhar as modulações afetuosas e tocantes de uma voz que vinha aboiando. Quem nunca ouviu essa ária ' +
  'rude, improvisada pelos nossos vaqueiros do sertão, não imagina o encanto que produzem os seus arpejos ' +
  'maviosos, quando se derramam pela solidão, ao pôr do sol, nessa hora mística do crepúsculo, em que o céu ' +
  'tem vibrações crebras e profundas. Não se distinguem palavras na canção do boiadeiro, nem ele as articula, ' +
  'pois fala ao seu gado com essa linguagem do coração que enternece os animais e os cativa.';

const MUSEUM_TEXT =
  'Os fãs da Informática já podem ver em Belo Horizonte raridades como a única cópia feita no mundo do ' +
  'Macintosh da Apple, modelos Mac e drives de 5 polegadas e meia e face simples. O acervo com 60 peças, ' +
  'reunidas ao longo dos 15 anos da Microcity, faz parte do Museu do Computador instalado na sede da empresa ' +
  'no bairro Vale do Sereno, município de Nova Lima.';

const LONG_TEXT_UNITS = [
  'Qual será o seu pedido?',
  'Sem paciência não se ganha o céu.',
  'O carneiro trouxe as cartas.',
  'Todo exercício com tempo marcado deverá ser copiado sem demora e sem distração.',
  'Não olhe para o teclado. Empregue sempre os dedos certos. Assim você será um excelente digitador.',
  ABOIO_TEXT,
  MUSEUM_TEXT,
];

const longTexts: SeedPedagogicalLesson[] = LONG_TEXT_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 72),
    level: 1,
    title:
      i === 5
        ? 'Texto longo — O Aboio'
        : i === 6
          ? 'Texto longo — Um museu só para computadores'
          : `Velocidade — frase ${String(i + 1)}`,
    content: i >= 5 ? unit : drill(unit, 1, 5),
    targetKeys: i >= 5 ? keys(unit) : keys(drill(unit, 1, 5)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'LONG_TEXTS',
    lessonInPhase: i + 1,
  })
);

export const NUMERIC_KEYPAD_UNITS = ['123', '456'];

const numericKeypad: SeedPedagogicalLesson[] = NUMERIC_KEYPAD_UNITS.map(
  (unit, i): SeedPedagogicalLesson => ({
    id: id(i + 79),
    level: 1,
    title: `Fase ${String(i + 1)} — teclado numérico (${unit})`,
    content: drill(unit, 10, 4),
    targetKeys: keys(drill(unit, 10, 4)),
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'NUMERIC_KEYPAD',
    lessonInPhase: i + 1,
  })
);

export const SEED_PEDAGOGICAL_CURRICULUM: SeedPedagogicalLesson[] = [
  ergonomicsLesson,
  ...homeRow,
  ...upperLower,
  ...wordFixation,
  ...accentuation,
  ...longTexts,
  ...numericKeypad,
];
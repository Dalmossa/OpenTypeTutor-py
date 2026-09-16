export const PEDAGOGICAL_PHASE_ORDER = [
  'ERGONOMICS_SETUP',
  'HOME_ROW',
  'UPPER_LOWER_ROWS',
  'WORD_FIXATION',
  'ACCENTUATION',
  'LONG_TEXTS',
  'NUMERIC_KEYPAD',
] as const;

export type PedagogicalPhaseValue = (typeof PEDAGOGICAL_PHASE_ORDER)[number];

export const PEDAGOGICAL_PHASES: Record<PedagogicalPhaseValue, { label: string; description: string }> = {
  ERGONOMICS_SETUP: {
    label: 'Check-in ergonômico',
    description: 'Ajuste de postura e posicionamento das mãos antes de começar a digitar.',
  },
  HOME_ROW: {
    label: 'Linha guia',
    description: 'As teclas do meio do teclado (asdfghjklç) — base do posicionamento dos dedos.',
  },
  UPPER_LOWER_ROWS: {
    label: 'Fileiras superior e inferior',
    description: 'As teclas acima e abaixo da linha guia, trabalhando a memória das posições.',
  },
  WORD_FIXATION: {
    label: 'Fixação de palavras',
    description: 'Formação de palavras com as teclas já aprendidas para automatizar a digitação.',
  },
  ACCENTUATION: {
    label: 'Acentuação',
    description: 'Digitação de palavras acentuadas e frases com o uso de teclas mortas.',
  },
  LONG_TEXTS: {
    label: 'Textos longos',
    description: 'Frases e trechos maiores para ganhar velocidade e resistência.',
  },
  NUMERIC_KEYPAD: {
    label: 'Teclado numérico',
    description: 'Treino da parte numérica do teclado para finalizar o currículo.',
  },
};

export function phaseOrder(phase: string | null): number {
  const index = PEDAGOGICAL_PHASE_ORDER.indexOf(phase as PedagogicalPhaseValue);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function phaseInfo(phase: string | null): { label: string; description: string } | null {
  if (phase === null) {
    return null;
  }
  return PEDAGOGICAL_PHASES[phase as PedagogicalPhaseValue] ?? null;
}
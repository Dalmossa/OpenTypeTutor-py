import type { ReactNode } from 'react';

// Jornada das 7 fases (RN25) para a Landing (§4.4 UI-UX-SRD). Dados de exibição
// pt-BR — a ordem reflete PRD RN25; nenhuma RN é reimplementada aqui (ADR-018).
const JOURNEY: ReadonlyArray<{
  phase: string;
  number: string;
  name: string;
  tagline: string;
}> = [
  {
    phase: 'ERGONOMICS_SETUP',
    number: '①',
    name: 'Ergonomia',
    tagline: 'Preparando seu espaço',
  },
  {
    phase: 'HOME_ROW',
    number: '②',
    name: 'Linha Inicial',
    tagline: 'Construindo a memória muscular',
  },
  {
    phase: 'UPPER_LOWER_ROWS',
    number: '③',
    name: 'Linhas Superior e Inferior',
    tagline: 'Ampliando seu domínio',
  },
  {
    phase: 'WORD_FIXATION',
    number: '④',
    name: 'Fixação de Palavras',
    tagline: 'Transformando teclas em palavras',
  },
  {
    phase: 'ACCENTUATION',
    number: '⑤',
    name: 'Acentuação',
    tagline: 'Digitando em português',
  },
  {
    phase: 'LONG_TEXTS',
    number: '⑥',
    name: 'Textos Longos',
    tagline: 'Desenvolvendo fluidez',
  },
  {
    phase: 'NUMERIC_KEYPAD',
    number: '⑦',
    name: 'Teclado Numérico',
    tagline: 'Dominando números e símbolos',
  },
];

export function PhaseJourney(): ReactNode {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {JOURNEY.map((step) => (
        <li
          key={step.phase}
          className="rounded-lg border border-hairline bg-surface-1 p-5"
        >
          <p className="text-sm text-ink-subtle">{step.number}</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">
            {step.name}
          </h3>
          <p className="mt-1 text-sm text-ink-subtle">{step.tagline}</p>
        </li>
      ))}
    </ul>
  );
}
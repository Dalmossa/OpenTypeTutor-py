import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TypingInterface from '@/components/typing-interface';
import VirtualKeyboard from '@/components/virtual-keyboard';
import type { UseTypingSessionResult } from '@/hooks/use-typing-session';
import { KEY_HINT_TIMEOUT_MS } from '@/lib/typing-hints';
import type { LessonDTO } from '@/models/lesson';
import type { SubmitSessionResponseDTO } from '@/models/session';

const { getNextLessonMock } = vi.hoisted(() => ({
  getNextLessonMock: vi.fn(),
}));

vi.mock('@/controllers', () => ({
  createControllers: () => ({
    pedagogical: {
      submitProgressCard: vi.fn().mockResolvedValue(undefined),
      getNextLesson: getNextLessonMock,
    },
  }),
}));

function makeLesson(overrides?: Partial<LessonDTO>): LessonDTO {
  return {
    id: '7',
    level: 1,
    title: 'Lição 6 — linha guia (çlkjh)',
    content: 'kjlçl çkjl çlk j',
    targetKeys: ['j', 'k', 'l', 'ç'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: 'ABNT2',
    pedagogicalPhase: 'HOME_ROW',
    lessonInPhase: 6,
    ...overrides,
  };
}

function makeResult(finalUncorrectedErrors: number): SubmitSessionResponseDTO {
  return {
    sessionId: 's1',
    state: 'COMPLETED',
    metrics: {
      charactersTyped: 40,
      correctCharacters: 38,
      incorrectCharacters: 2,
      correctedErrors: 1,
      finalUncorrectedErrors,
      accuracy: 95,
      grossWpm: 20,
      netWpm: 19,
      activeDurationMs: 40000,
      averageLatencyMs: 400,
    },
  };
}

type PartialSession = Partial<Omit<UseTypingSessionResult, 'start' | 'handleInput' | 'handleBackspace' | 'handleCompositionChange' | 'handleCompositionEnd' | 'pause' | 'resume' | 'abandon' | 'submit' | 'reset'>>;

function makeSession(overrides: PartialSession = {}): UseTypingSessionResult {
  return {
    phase: 'completed',
    lesson: makeLesson(),
    sessionId: 's1',
    token: 'token',
    state: 'COMPLETED',
    stats: {
      typed: 40,
      correct: 38,
      incorrect: 2,
      corrections: 1,
      errors: 1,
      averageLatencyMs: 400,
      activeDurationMs: 40000,
      grossWpm: 20,
      netWpm: 19,
      accuracy: 95,
    },
    progress: 1,
    position: 18,
    errorIndexes: [],
    composition: '',
    result: makeResult(0),
    lastInsecureKeys: [],
    errorMessage: null,
    breakRemainingMs: 0,
    start: vi.fn(),
    handleInput: vi.fn(),
    handleBackspace: vi.fn(),
    handleCompositionChange: vi.fn(),
    handleCompositionEnd: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    abandon: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  } as UseTypingSessionResult;
}

beforeEach(() => {
  getNextLessonMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CompletedPanel — RN26 (botão azul Avançar)', () => {
  it('reason advance com erros finais ainda mostra o botão azul Avançar', async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: '8', title: 'Lição 7 — linha guia' }),
      shouldVaryExercise: false,
      reason: 'advance',
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(2) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(await screen.findByRole('button', { name: 'Avançar' })).toBeInTheDocument();
    expect(screen.getByText(/A lição avançou, mas ainda ficaram 2 erros finais/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repetir lição' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar às lições' })).toBeInTheDocument();
  });

  it('reason advance sem erros finais mostra botão azul e mensagem de excelente', async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: '8' }),
      shouldVaryExercise: false,
      reason: 'advance',
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(0) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Excelente! Você concluiu a lição sem erros finais/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avançar' })).toBeInTheDocument();
  });

  it('reason repeat não mostra botão azul, apenas Repetir lição', async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson(),
      shouldVaryExercise: false,
      reason: 'repeat',
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(1) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Repita a lição com mais atenção/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avançar' })).not.toBeInTheDocument();
  });
});

describe('VirtualKeyboard hintKey — RN39', () => {
  it('a tecla indicada recebe data-hint=true e classe de blink', () => {
    render(<VirtualKeyboard layout="ABNT2" pressedKeys={new Set()} hintKey="a" />);
    const hinted = document.querySelector('[data-key="a"]');
    expect(hinted?.getAttribute('data-hint')).toBe('true');
    expect(hinted?.className).toContain('ott-key-hint');
    const plain = document.querySelector('[data-key="s"]');
    expect(plain?.getAttribute('data-hint')).toBe('false');
  });
});

describe('TypingInterface hint — RN39', () => {
  it('após o tempo médio padrão, a tecla aguardada pisca no teclado virtual', () => {
    vi.useFakeTimers();
    const session = makeSession({
      phase: 'typing',
      lesson: makeLesson({ content: '3jka 5' }),
      position: 0,
      progress: 0,
      state: 'RUNNING',
      result: null,
    });
    const { container } = render(
      <TypingInterface
        session={session}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    const awaited = container.querySelector('[data-key="Num3"]');
    expect(awaited?.getAttribute('data-hint')).toBe('false');
    act(() => {
      vi.advanceTimersByTime(KEY_HINT_TIMEOUT_MS);
    });
    expect(awaited?.getAttribute('data-hint')).toBe('true');
  });
});
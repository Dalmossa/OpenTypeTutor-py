import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TypingInterface from "@/components/typing-interface";
import VirtualKeyboard from "@/components/virtual-keyboard";
import type { UseTypingSessionResult } from "@/hooks/use-typing-session";
import { KEY_HINT_TIMEOUT_MS } from "@/lib/typing-hints";
import type { LessonDTO } from "@/models/lesson";
import type {
  SessionMetricsDTO,
  SubmitSessionResponseDTO,
} from "@/models/session";

const { getNextLessonMock, submitProgressCardMock } = vi.hoisted(() => ({
  getNextLessonMock: vi.fn(),
  submitProgressCardMock: vi.fn(),
}));

vi.mock("@/controllers", () => ({
  createControllers: () => ({
    pedagogical: {
      submitProgressCard: submitProgressCardMock,
      getNextLesson: getNextLessonMock,
    },
  }),
}));

function makeLesson(overrides?: Partial<LessonDTO>): LessonDTO {
  return {
    id: "7",
    level: 1,
    title: "Lição 6 — linha guia (çlkjh)",
    content: "kjlçl çkjl çlk j",
    targetKeys: ["j", "k", "l", "ç"],
    difficulty: "GUIDED",
    type: "PRACTICE",
    layout: "ABNT2",
    pedagogicalPhase: "HOME_ROW",
    lessonInPhase: 6,
    ...overrides,
  };
}

function makeResult(
  finalUncorrectedErrors: number,
  metrics: Partial<SessionMetricsDTO> = {},
): SubmitSessionResponseDTO {
  return {
    sessionId: "s1",
    state: "COMPLETED",
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
      // 40s e 40 caracteres passam dos limiares da RN22, então o backend
      // devolveria `false` aqui. Declarar explicitamente é o ponto: o painel
      // lê a flag, não a recalcula.
      insufficientData: false,
      ...metrics,
    },
  };
}

type PartialSession = Partial<
  Omit<
    UseTypingSessionResult,
    | "start"
    | "handleInput"
    | "handleBackspace"
    | "handleCompositionChange"
    | "handleCompositionEnd"
    | "pause"
    | "resume"
    | "abandon"
    | "submit"
    | "reset"
  >
>;

function makeSession(overrides: PartialSession = {}): UseTypingSessionResult {
  return {
    phase: "completed",
    lesson: makeLesson(),
    sessionId: "s1",
    token: "token",
    state: "COMPLETED",
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
    composition: "",
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
  };
}

beforeEach(() => {
  getNextLessonMock.mockReset();
  submitProgressCardMock.mockReset();
  submitProgressCardMock.mockResolvedValue({
    progressCard: null,
    advanced: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CompletedPanel — RN26 (botão azul Avançar)", () => {
  it("reason advance com erros finais ainda mostra o botão azul Avançar", async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8", title: "Lição 7 — linha guia" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(2) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Avançar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A lição avançou, mas ainda ficaram 2 erros finais/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Repetir lição" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voltar às lições" }),
    ).toBeInTheDocument();
  });

  it("reason advance sem erros finais mostra botão azul e mensagem de excelente", async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(0) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(
        /Excelente! Você concluiu a lição sem erros finais/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avançar" })).toBeInTheDocument();
  });

  it("reason repeat não mostra botão azul, apenas Repetir lição", async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson(),
      shouldVaryExercise: false,
      reason: "repeat",
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(1) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/Repita a lição com mais atenção/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Avançar" }),
    ).not.toBeInTheDocument();
  });

  it("RN26(d) - lição de revisão (advanced:false) não renderiza Avançar nem mensagem de avanço", async () => {
    submitProgressCardMock.mockResolvedValue({
      progressCard: null,
      advanced: false,
    });
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({ result: makeResult(0) })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/Lição de revisão concluída/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Excelente! Você concluiu a lição sem erros finais/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Avançar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Repetir lição" }),
    ).toBeInTheDocument();
    expect(submitProgressCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: "7" }),
      "token",
    );
  });
});

describe("CompletedPanel — RN22 (dados insuficientes)", () => {
  it("insufficientData:true mostra a tela de sessão curta e não registra cartão", async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({
          result: makeResult(0, { insufficientData: true }),
        })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );

    expect(await screen.findByText("Sessão muito curta")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Avançar" }),
    ).not.toBeInTheDocument();
    // Registrar cartão aqui moveria a fronteira do currículo com uma métrica que
    // a RN22 diz não ter significado — o painel é o fail-closed do cliente.
    expect(submitProgressCardMock).not.toHaveBeenCalled();
  });

  it("a tela confia na flag do backend em vez de rederivar a RN22 dos números", async () => {
    // 100ms e 2 caracteres ficariam abaixo dos limiares se a tela os
    // rederivasse (`< 3000 || < 5`), e ela mostraria "Sessão muito curta".
    // Com a flag do backend valendo `false`, ela renderiza o resultado normal.
    // É este teste que quebra se alguém reintroduzir literais no componente.
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({
          result: makeResult(0, {
            activeDurationMs: 100,
            charactersTyped: 2,
            insufficientData: false,
          }),
        })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );

    expect(await screen.findByText("Lição concluída!")).toBeInTheDocument();
    expect(screen.queryByText("Sessão muito curta")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avançar" })).toBeInTheDocument();
  });

  it("insufficientData:false em sessão curta renderiza o painel normal", async () => {
    getNextLessonMock.mockResolvedValue({
      lesson: makeLesson({ id: "8" }),
      shouldVaryExercise: false,
      reason: "advance",
    });
    render(
      <TypingInterface
        session={makeSession({
          result: makeResult(0, { insufficientData: false }),
        })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );

    expect(await screen.findByText("Lição concluída!")).toBeInTheDocument();
  });
});

describe("Botão de pausa", () => {
  it("em digitação mostra Pausar; quando pausado mostra Pausado e retoma no clique", () => {
    const { rerender } = render(
      <TypingInterface
        session={makeSession({
          phase: "typing",
          state: "RUNNING",
          result: null,
          progress: 0,
        })}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    const paused = makeSession({
      phase: "paused",
      state: "PAUSED",
      result: null,
      progress: 0,
    });
    paused.resume = vi.fn();
    rerender(
      <TypingInterface
        session={paused}
        onBack={vi.fn()}
        onRepeatLesson={vi.fn()}
        onAdvanceLesson={vi.fn()}
      />,
    );
    const pausedButton = screen.getByRole("button", { name: "Pausado" });
    expect(pausedButton).toBeInTheDocument();
    pausedButton.click();
    expect(paused.resume).toHaveBeenCalledOnce();
  });
});

describe("VirtualKeyboard hintKey — RN39", () => {
  it("a tecla indicada recebe data-hint=true e classe de blink", () => {
    render(
      <VirtualKeyboard layout="ABNT2" pressedKeys={new Set()} hintKey="a" />,
    );
    const hinted = document.querySelector('[data-key="a"]');
    expect(hinted?.getAttribute("data-hint")).toBe("true");
    expect(hinted?.className).toContain("ott-key-hint");
    const plain = document.querySelector('[data-key="s"]');
    expect(plain?.getAttribute("data-hint")).toBe("false");
  });
});

describe("TypingInterface hint — RN39", () => {
  it("após o tempo médio padrão, a tecla aguardada pisca no teclado virtual", () => {
    vi.useFakeTimers();
    const session = makeSession({
      phase: "typing",
      lesson: makeLesson({ content: "3jka 5" }),
      position: 0,
      progress: 0,
      state: "RUNNING",
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
    expect(awaited?.getAttribute("data-hint")).toBe("false");
    act(() => {
      vi.advanceTimersByTime(KEY_HINT_TIMEOUT_MS);
    });
    expect(awaited?.getAttribute("data-hint")).toBe("true");
  });
});

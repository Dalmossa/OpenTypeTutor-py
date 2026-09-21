'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CompositionEvent as ReactCompositionEvent,
  FormEvent as ReactFormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react';

import InfoTip from '@/components/info-tip';
import VirtualKeyboard from '@/components/virtual-keyboard';
import { createControllers } from '@/controllers';
import { buildKeyboardModel, resolveAwaitedKey, resolveKeyLabel } from '@/lib/virtual-keyboard';
import { getMetricHelp } from '@/lib/metric-help';
import { KEY_HINT_TIMEOUT_MS } from '@/lib/typing-hints';
import type { LessonDTO } from '@/models/lesson';
import type { PedagogicalReason } from '@/models/pedagogical';
import type { SubmitSessionResponseDTO } from '@/models/session';
import type { UseTypingSessionResult } from '@/hooks/use-typing-session';

interface TypingInterfaceProps {
  session: UseTypingSessionResult;
  onBack: () => void;
  onRepeatLesson: () => void;
  onAdvanceLesson: (lesson: LessonDTO) => void;
}

const STATUS_LABELS: Record<string, string> = {
  IDLE: 'Pronto para começar',
  RUNNING: 'Sessão ativa',
  PAUSED: 'Sessão pausada',
  ABANDONED: 'Sessão abandonada',
  COMPLETED: 'Lição concluída',
};

export default function TypingInterface({ session, onBack, onRepeatLesson, onAdvanceLesson }: TypingInterfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const committedRef = useRef(false);
  const compositionStrRef = useRef('');
  const [showComposition, setShowComposition] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<ReadonlySet<string>>(new Set());
  const [hintKey, setHintKey] = useState<string | null>(null);

  const lesson = session.lesson;
  const content = useMemo(
    () => (lesson?.content ?? '').replace(/[\r\n]+/g, ' '),
    [lesson?.content],
  );
  const keyboardModel = useMemo(() => buildKeyboardModel(lesson?.layout ?? 'ABNT2'), [lesson?.layout]);

  // RN39 - quando o usuário demora além do tempo médio padrão de digitação na tecla
  // aguardada, o teclado virtual pisca a tecla como dica. O timer reinicia a cada
  // posição digitada e é suspenso durante composição de tecla morta.
  useEffect(() => {
    setHintKey(null);
    if (session.phase !== 'typing' || showComposition) {
      return;
    }
    const awaited = content[session.position];
    if (awaited === undefined) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const prevChar = session.position > 0 ? content[session.position - 1] ?? null : null;
      setHintKey(resolveAwaitedKey(awaited, prevChar, keyboardModel));
    }, KEY_HINT_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [session.phase, session.position, showComposition, content, keyboardModel]);

  function markPressed(code: string, key: string): void {
    const label = resolveKeyLabel(code, key, keyboardModel);
    if (label !== null) {
      setPressedKeys((prev) => new Set(prev).add(label));
    }
  }

  function markReleased(code: string, key: string): void {
    const label = resolveKeyLabel(code, key, keyboardModel);
    if (label !== null) {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(label);
        return next;
      });
    }
  }

  function clearPressed(): void {
    setPressedKeys(new Set());
  }

  function handleBeforeInput(e: ReactFormEvent<HTMLInputElement>): void {
    const data = (e as ReactFormEvent<HTMLInputElement> & { data: string | null }).data;
    if (data !== null && data !== '') {
      committedRef.current = true;
      session.handleInput(e.currentTarget.value + data, data);
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    markPressed(e.code, e.key);
    if (e.key === 'Backspace') {
      e.preventDefault();
      session.handleBackspace();
    }
  }

  function handleKeyUp(e: ReactKeyboardEvent<HTMLInputElement>): void {
    markReleased(e.code, e.key);
  }

  function handleBlur(): void {
    clearPressed();
  }

  function handleCompositionStart(): void {
    composingRef.current = true;
    committedRef.current = false;
    compositionStrRef.current = '';
    setShowComposition(true);
  }

  function handleCompositionUpdate(e: ReactCompositionEvent<HTMLInputElement>): void {
    compositionStrRef.current = e.data;
    session.handleCompositionChange(e.data);
    setShowComposition(e.data.length > 0);
  }

  function handleCompositionEnd(): void {
    composingRef.current = false;
    setShowComposition(false);
    session.handleCompositionChange('');
    const composed = compositionStrRef.current;
    compositionStrRef.current = '';
    if (!committedRef.current && composed !== '') {
      session.handleCompositionEnd(composed);
    }
  }

  function refocus(): void {
    inputRef.current?.focus();
  }

  const stats = session.stats;
  const isIdle = session.phase === 'idle';
  const isCompleted = session.phase === 'completed';
  const isPaused = session.phase === 'paused';

  if (session.phase === 'loading' || session.phase === 'submitting') {
    return (
      <div className="py-16 text-center text-ink-subtle">
        {session.phase === 'loading' ? 'Iniciando sessão…' : 'Enviando resultados…'}
      </div>
    );
  }

  if (isIdle) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-ink-subtle">Nenhuma sessão ativa. Selecione uma lição para começar.</p>
      </div>
    );
  }

  if (isCompleted && session.result !== null) {
    return (
      <CompletedPanel
        result={session.result}
        token={session.token}
        insecureKeys={session.lastInsecureKeys}
        backspaceCount={session.stats.corrections}
        onBack={onBack}
        onRepeatLesson={onRepeatLesson}
        onAdvanceLesson={onAdvanceLesson}
      />
    );
  }

  if (session.phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-danger">{session.errorMessage}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-hairline-strong px-4 py-2 text-ink-muted"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {session.errorMessage !== null && (
        <p className="rounded-md bg-danger-bg px-4 py-2 text-sm text-danger-fg">{session.errorMessage}</p>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="PPM bruta" value={formatNumber(stats.grossWpm)} />
        <Metric label="PPM líquida" value={formatNumber(stats.netWpm)} />
        <Metric label="Precisão" value={`${formatDecimal(stats.accuracy)}%`} />
        <Metric label="Latência média" value={`${Math.round(stats.averageLatencyMs)} ms`} />
        <Metric label="Erros restantes" value={String(stats.errors)} />
        <Metric label="Duração" value={formatDuration(stats.activeDurationMs)} />
      </div>

      <div onClick={refocus} className="cursor-text rounded-xl border border-hairline-strong bg-surface-2 p-6">
        <div className="font-mono text-xl leading-relaxed tracking-wide">
          {Array.from(content).map((ch, index) => {
            let cls = 'text-ink-tertiary';
            if (index < session.position) {
              cls = session.errorIndexes.includes(index) ? 'text-danger-fg underline' : 'text-success';
            } else if (index === session.position) {
              cls = 'bg-primary text-white';
            }
            return (
              <span key={index} className={cls}>
                {ch}
              </span>
            );
          })}
          {showComposition && <span className="ml-2 text-warning">[{compositionStrRef.current}]</span>}
        </div>
        <input
          ref={inputRef}
          type="text"
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onBeforeInput={handleBeforeInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={handleBlur}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          className="mt-4 h-0 w-full opacity-0 focus:outline-none"
          aria-label="Área de digitação"
        />
      </div>

      <VirtualKeyboard layout={lesson?.layout ?? 'ABNT2'} pressedKeys={pressedKeys} hintKey={hintKey} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-subtle">
          {STATUS_LABELS[session.state ?? 'IDLE'] ?? session.state}
          {' · '}
          {Math.round(session.progress * 100)}%
        </p>
        <div className="flex gap-3">
          {isPaused ? (
            <button type="button" onClick={() => void session.resume()} className="rounded-md bg-primary px-4 py-2 text-white">
              Pausado
            </button>
          ) : (
            <button type="button" onClick={() => void session.pause()} className="rounded-md border border-hairline-strong px-4 py-2 text-ink-muted">
              Pausar
            </button>
          )}
          <button
            type="button"
            onClick={() => void session.submit()}
            className="rounded-md bg-primary px-4 py-2 text-white"
          >
            Encerrar sessão
          </button>
          <button
            type="button"
            onClick={() => void session.abandon()}
            className="rounded-md border border-danger px-4 py-2 text-danger"
          >
            Abandonar
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactNode {
  const help = getMetricHelp(label);
  return (
    <div className="rounded-lg bg-surface-1 px-3 py-2">
      <p className="text-xs text-ink-subtle">
        {label}
        {help !== undefined && <InfoTip text={help} />}
      </p>
      <p className="text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

interface CompletedPanelProps {
  result: SubmitSessionResponseDTO;
  token: string | null;
  insecureKeys: string[];
  backspaceCount: number;
  onBack: () => void;
  onRepeatLesson: () => void;
  onAdvanceLesson: (lesson: LessonDTO) => void;
}

type CompletionVerdict =
  | { status: 'checking' }
  | { status: 'ready'; lesson: LessonDTO | null; reason: PedagogicalReason }
  | { status: 'error'; message: string };

function CompletedPanel({
  result,
  token,
  insecureKeys,
  backspaceCount,
  onBack,
  onRepeatLesson,
  onAdvanceLesson,
}: CompletedPanelProps): ReactNode {
  const m = result.metrics;
  const isInsufficient = m.activeDurationMs < 3000 || m.charactersTyped < 5;
  const [verdict, setVerdict] = useState<CompletionVerdict>({ status: 'checking' });
  const submittedRef = useRef(false);

  useEffect(() => {
    if (isInsufficient || submittedRef.current || token === null) {
      return;
    }
    submittedRef.current = true;
    const pedagogical = createControllers().pedagogical;
    void (async () => {
      try {
        await pedagogical.submitProgressCard(
          {
            insecureKeys,
            discomfortReported: false,
            nextSessionNote: 'Lição concluída. Próxima sessão recomendada.',
            currentBackspaceCount: backspaceCount,
          },
          token,
        );
        const next = await pedagogical.getNextLesson(token);
        setVerdict({ status: 'ready', lesson: next.lesson, reason: next.reason });
      } catch (err) {
        setVerdict({
          status: 'error',
          message: err instanceof Error ? err.message : 'Falha ao registrar o progresso',
        });
      }
    })();
  }, [isInsufficient, token, insecureKeys, backspaceCount]);

  if (isInsufficient) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Sessão muito curta</h2>
        <p className="text-ink-muted">
          A sessão teve dados insuficientes para calcular métricas (tempo &lt; 3s ou menos de 5 caracteres).
        </p>
        <button type="button" onClick={onBack} className="rounded-md bg-primary px-4 py-2 text-white">
          Voltar às lições
        </button>
      </div>
    );
  }

  // RN26 - o motor pedagógico já decide o avanço (reason 'advance'). A presença de
  // erros finais não bloqueia o botão azul de avançar; a mensagem apenas orienta.
  const canAdvance =
    verdict.status === 'ready' && verdict.reason === 'advance' && verdict.lesson !== null;

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <h2 className="text-2xl font-bold">Lição concluída!</h2>
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        <ResultMetric label="PPM líquida" value={formatNumber(m.netWpm)} />
        <ResultMetric label="PPM bruta" value={formatNumber(m.grossWpm)} />
        <ResultMetric label="Precisão" value={`${formatDecimal(m.accuracy * 100)}%`} />
        <ResultMetric label="Caracteres" value={String(m.charactersTyped)} />
        <ResultMetric label="Erros corrigidos" value={String(m.correctedErrors)} />
        <ResultMetric label="Erros finais" value={String(m.finalUncorrectedErrors)} />
      </div>

      {verdict.status === 'checking' && <p className="text-sm text-ink-subtle">Registrando seu progresso…</p>}

      {verdict.status === 'error' && (
        <p className="text-sm text-danger">{verdict.message}</p>
      )}

      {verdict.status === 'ready' && verdict.reason === 'complete' && (
        <p className="max-w-md text-sm text-ink-muted">
          Parabéns! Você concluiu todo o currículo. Cada vencedor da jornada é você.
        </p>
      )}

      {verdict.status === 'ready' && verdict.reason === 'pause_discomfort' && (
        <p className="max-w-md text-sm text-ink-muted">
          Desconforto sinalizado anteriormente: dê uma pausa, alongue e hidrate-se antes de retomar o treino.
        </p>
      )}

      {verdict.status === 'ready' &&
        verdict.reason === 'advance' &&
        m.finalUncorrectedErrors === 0 && (
          <p className="max-w-md text-sm text-ink-muted">
            Excelente! Você concluiu a lição sem erros finais e atingiu o critério de avanço.
          </p>
        )}

      {verdict.status === 'ready' &&
        (verdict.reason === 'repeat' || verdict.reason === 'vary') && (
          <p className="max-w-md text-sm text-ink-muted">
            Boa tentativa! Você precisa reduzir a quantidade de backspaces em relação à sessão anterior para
            avançar. {verdict.reason === 'vary' ? 'Vamos variar um pouco o exercício antes de repetir.' : 'Repita a lição com mais atenção.'}
          </p>
        )}

      {verdict.status === 'ready' && verdict.reason === 'advance' && m.finalUncorrectedErrors > 0 && (
        <p className="max-w-md text-sm text-ink-muted">
          A lição avançou, mas ainda ficaram {String(m.finalUncorrectedErrors)} {m.finalUncorrectedErrors === 1 ? 'erro final' : 'erros finais'}. Recomendamos repeti-la
          para consolidar.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {verdict.status === 'ready' && canAdvance && verdict.lesson !== null && (
          <button
            type="button"
            onClick={() => onAdvanceLesson(verdict.lesson as LessonDTO)}
            className="rounded-md bg-primary px-4 py-2 font-medium text-white"
          >
            Avançar
          </button>
        )}
        {verdict.status === 'ready' && (canAdvance || verdict.reason === 'repeat' || verdict.reason === 'vary' || (verdict.reason === 'advance' && !canAdvance)) && (
          <button type="button" onClick={onRepeatLesson} className="rounded-md bg-primary px-4 py-2 text-white">
            Repetir lição
          </button>
        )}
        {(verdict.status === 'error' || verdict.status === 'ready') && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-hairline-strong px-4 py-2 text-ink-muted"
          >
            Voltar às lições
          </button>
        )}
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }): ReactNode {
  const help = getMetricHelp(label);
  return (
    <div className="rounded-lg bg-surface-1 px-3 py-3">
      <p className="text-xs text-ink-subtle">
        {label}
        {help !== undefined && <InfoTip text={help} />}
      </p>
      <p className="text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatNumber(value: number): string {
  return Math.round(value * 10) / 10 === value ? String(Math.round(value)) : (Math.round(value * 10) / 10).toFixed(1);
}

function formatDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
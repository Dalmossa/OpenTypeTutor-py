'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  EventType,
  KeystrokeEventDTO,
  SessionMetricsDTO,
  SessionState,
  SubmitSessionResponseDTO,
} from '@/models/session';
import type { LessonDTO } from '@/models/lesson';
import { createControllers } from '@/controllers';
import type { SessionController } from '@/controllers/session-controller';
import type { ApiError } from '@/services/api-client';

export interface TypingSessionStats {
  typed: number;
  correct: number;
  incorrect: number;
  corrections: number;
  errors: number;
  averageLatencyMs: number;
  activeDurationMs: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
}

export interface TypingSessionState {
  phase: 'idle' | 'loading' | 'typing' | 'paused' | 'submitting' | 'completed' | 'error';
  lesson: LessonDTO | null;
  sessionId: string | null;
  token: string | null;
  state: SessionState | null;
  stats: TypingSessionStats;
  progress: number;
  position: number;
  errorIndexes: number[];
  composition: string;
  result: SubmitSessionResponseDTO | null;
  lastInsecureKeys: string[];
  errorMessage: string | null;
}

const EMPTY_STATS: TypingSessionStats = {
  typed: 0,
  correct: 0,
  incorrect: 0,
  corrections: 0,
  errors: 0,
  averageLatencyMs: 0,
  activeDurationMs: 0,
  grossWpm: 0,
  netWpm: 0,
  accuracy: 0,
};

export interface UseTypingSessionResult extends TypingSessionState {
  start: (lessonId: string, lesson: LessonDTO, token: string) => Promise<void>;
  handleInput: (text: string, inserted: string | null) => void;
  handleBackspace: () => void;
  handleCompositionChange: (text: string) => void;
  handleCompositionEnd: (composed?: string) => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  abandon: () => Promise<void>;
  submit: () => Promise<void>;
  reset: () => void;
}

export function useTypingSession(): UseTypingSessionResult {
  const sessions = useRef<SessionController | null>(null);
  const [session, setSession] = useState<TypingSessionState>({
    phase: 'idle',
    lesson: null,
    sessionId: null,
    token: null,
    state: null,
    stats: EMPTY_STATS,
    progress: 0,
    position: 0,
    errorIndexes: [],
    composition: '',
    result: null,
    lastInsecureKeys: [],
    errorMessage: null,
  });

  const targetRef = useRef<string>('');
  const positionRef = useRef(0);
  const errorsRef = useRef(new Set<number>());
  const keystrokesRef = useRef<KeystrokeEventDTO[]>([]);
  const latencyStartRef = useRef<number | null>(null);
  const lastLatencyRef = useRef<number | null>(null);
  const activeStartRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const compositionRef = useRef<string>('');
  const compositionStartRef = useRef<number | null>(null);
  const statsRef = useRef<TypingSessionStats>(EMPTY_STATS);
  const pausedRef = useRef(false);

  const getActiveDurationMs = useCallback((): number => {
    if (activeStartRef.current === null) {
      return 0;
    }
    const now = Date.now();
    let active = now - activeStartRef.current - totalPausedRef.current;
    if (pauseStartRef.current !== null) {
      active -= now - pauseStartRef.current;
    }
    return Math.max(0, Math.round(active));
  }, []);

  const computeStats = useCallback((): TypingSessionStats => {
    let latencies = 0;
    let latencyCount = 0;
    for (const k of keystrokesRef.current) {
      if (k.latencyMs !== null) {
        latencies += k.latencyMs;
        latencyCount += 1;
      }
    }
    const typed = keystrokesRef.current.filter((k) => k.eventType !== 'DEAD_KEY_COMPOSE').length;
    const correct = keystrokesRef.current.filter((k) => k.eventType === 'CORRECT').length;
    const incorrect = keystrokesRef.current.filter((k) => k.eventType === 'INCORRECT').length;
    const corrections = keystrokesRef.current.filter((k) => k.eventType === 'CORRECTION').length;
    const errors = errorsRef.current.size;
    const activeDurationMs = getActiveDurationMs();
    const minutes = Math.max(activeDurationMs / 60000.0, 1 / 60);
    return {
      typed,
      correct,
      incorrect,
      corrections,
      errors,
      averageLatencyMs: latencyCount > 0 ? latencies / latencyCount : 0,
      activeDurationMs,
      grossWpm: Math.round((typed / minutes) * 10) / 10,
      netWpm: Math.round((correct / minutes) * 10) / 10,
      accuracy: typed > 0 ? (correct / typed) * 100 : 0,
    };
  }, [getActiveDurationMs]);

  const patchSession = useCallback((patch: Partial<TypingSessionState>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const pushKeystroke = useCallback((keystroke: KeystrokeEventDTO) => {
    keystrokesRef.current.push(keystroke);
    const stats = computeStats();
    statsRef.current = stats;
    const progress = mathProgress();
    patchSession({
      stats,
      progress,
      position: positionRef.current,
      errorIndexes: Array.from(errorsRef.current).sort((a, b) => a - b),
    });
  }, [computeStats, patchSession]);

  function mathProgress(): number {
    if (targetRef.current.length === 0) {
      return 0;
    }
    return Math.min(1, positionRef.current / targetRef.current.length);
  }

  const makeEvent = useCallback(
    (expected: string, typed: string | null, physical: string, logical: string, eventType: EventType, composed: string | null): KeystrokeEventDTO => {
      const now = Date.now();
      let latencyMs: number | null = null;
      if (lastLatencyRef.current !== null) {
        latencyMs = Math.max(0, now - lastLatencyRef.current);
      }
      lastLatencyRef.current = now;
      return {
        expectedKey: expected,
        typedKey: typed,
        physicalKey: physical,
        logicalKey: logical,
        eventType,
        timestampMs: now,
        latencyMs,
        composedCharacter: composed,
      };
    },
    [],
  );

  const start = useCallback(
    async (lessonId: string, lesson: LessonDTO, token: string) => {
      sessions.current = createControllers().sessions;
      targetRef.current = lesson.content.replace(/[\r\n]+/g, ' ');
      positionRef.current = 0;
      errorsRef.current = new Set();
      keystrokesRef.current = [];
      lastLatencyRef.current = null;
      totalPausedRef.current = 0;
      pauseStartRef.current = null;
      submittedRef.current = false;
      pausedRef.current = false;
      sessionIdRef.current = null;
      tokenRef.current = token;
      statsRef.current = EMPTY_STATS;
      patchSession({
        phase: 'loading',
        lesson,
        sessionId: null,
        token,
        state: null,
        stats: EMPTY_STATS,
        progress: 0,
        position: 0,
        errorIndexes: [],
        composition: '',
        result: null,
        lastInsecureKeys: [],
        errorMessage: null,
      });
      try {
        const response = await sessions.current?.start(lessonId, token);
        if (response === undefined) {
          throw new Error('Sessão não inicializada');
        }
        sessionIdRef.current = response.sessionId;
        activeStartRef.current = Date.now();
        patchSession({ phase: 'typing', sessionId: response.sessionId, state: response.state });
      } catch (err) {
        patchSession({
          phase: 'error',
          sessionId: null,
          errorMessage: toMessage(err),
        });
      }
    },
    [patchSession],
  );

  const commitChar = useCallback(
    (typedChar: string, physicalKey: string) => {
      if (submittedRef.current) {
        return;
      }
      if (positionRef.current >= targetRef.current.length) {
        return;
      }
      const expected = targetRef.current[positionRef.current] ?? '';
      const isCorrect = typedChar === expected;
      if (!isCorrect) {
        errorsRef.current.add(positionRef.current);
      }
      positionRef.current += 1;
      pushKeystroke(
        makeEvent(expected, typedChar, physicalKey, physicalKey, isCorrect ? 'CORRECT' : 'INCORRECT', null),
      );
    },
    [makeEvent, pushKeystroke],
  );

  const handleInput = useCallback(
    (text: string, inserted: string | null) => {
      if (pausedRef.current) {
        return;
      }
      if (text.length > positionRef.current) {
        const nextChar = inserted ?? text[positionRef.current];
        if (nextChar !== undefined && nextChar !== null && nextChar !== '') {
          commitChar(nextChar, nextChar);
        }
      }
    },
    [commitChar],
  );

  const handleBackspace = useCallback(() => {
    if (submittedRef.current || pausedRef.current) {
      return;
    }
    const correctedIndex = positionRef.current - 1;
    if (correctedIndex < 0) {
      return;
    }
    positionRef.current = correctedIndex;
    errorsRef.current.delete(correctedIndex);
    const expected = targetRef.current[correctedIndex] ?? '';
    pushKeystroke(makeEvent(expected, null, 'Backspace', 'Backspace', 'CORRECTION', null));
  }, [makeEvent, pushKeystroke]);

  const handleCompositionChange = useCallback((text: string) => {
    const wasEmpty = compositionRef.current.length === 0;
    compositionRef.current = text;
    patchSession({ composition: text });
    if (wasEmpty && text.length > 0 && compositionStartRef.current === null) {
      compositionStartRef.current = Date.now();
      pushKeystroke({
        expectedKey: '',
        typedKey: null,
        physicalKey: 'Compose',
        logicalKey: 'Compose',
        eventType: 'DEAD_KEY_COMPOSE',
        timestampMs: compositionStartRef.current,
        latencyMs: null,
        composedCharacter: null,
      });
    }
  }, [patchSession, pushKeystroke]);

  const handleCompositionEnd = useCallback((composedOverride?: string) => {
    if (submittedRef.current || pausedRef.current) {
      return;
    }
    const composed = composedOverride ?? compositionRef.current;
    const composeStart = compositionStartRef.current;
    compositionRef.current = '';
    compositionStartRef.current = null;
    patchSession({ composition: '' });
    if (composed.length === 0) {
      return;
    }
    positionRef.current += composed.length - 1;
    const expected = targetRef.current[positionRef.current] ?? '';
    positionRef.current += 1;
    const isCorrect = composed === expected;
    if (!isCorrect) {
      errorsRef.current.add(positionRef.current - 1);
    }
    if (composeStart !== null) {
      lastLatencyRef.current = composeStart;
    }
    pushKeystroke(
      makeEvent(
        expected,
        composed,
        composed,
        composed,
        isCorrect ? 'CORRECT' : 'INCORRECT',
        composed,
      ),
    );
  }, [makeEvent, pushKeystroke, targetRef]);

  const computeInsecureKeys = useCallback((): string[] => {
    const keys = new Set<string>();
    for (const k of keystrokesRef.current) {
      if (k.eventType === 'INCORRECT' && k.logicalKey !== '') {
        keys.add(k.logicalKey);
      }
    }
    return Array.from(keys).sort();
  }, []);

  const doSubmit = useCallback(async () => {
    const sid = sessionIdRef.current;
    const token = tokenRef.current;
    if (sid === null || token === null || sessions.current === null) {
      return;
    }
    patchSession({ phase: 'submitting', errorMessage: null });
    try {
      const result = await sessions.current?.submit(sid, keystrokesRef.current, token);
      if (result === undefined) {
        throw new Error('Sessão não inicializada');
      }
      patchSession({
        phase: 'completed',
        state: 'COMPLETED',
        result,
        lastInsecureKeys: computeInsecureKeys(),
      });
    } catch (err) {
      submittedRef.current = false;
      patchSession({ phase: 'typing', errorMessage: toMessage(err) });
    }
  }, [computeInsecureKeys, patchSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeStartRef.current !== null && !pausedRef.current) {
        const stats = computeStats();
        statsRef.current = stats;
        patchSession({ stats });
      }
      if (!submittedRef.current && !pausedRef.current && targetRef.current.length > 0 && positionRef.current >= targetRef.current.length) {
        submittedRef.current = true;
        void doSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [computeStats, doSubmit, patchSession]);

  const pause = useCallback(async () => {
    const sid = sessionIdRef.current;
    const token = tokenRef.current;
    if (sid === null || token === null || sessions.current === null || pausedRef.current) {
      return;
    }
    try {
      await sessions.current?.pause(sid, token);
      pausedRef.current = true;
      pauseStartRef.current = Date.now();
      patchSession({ phase: 'paused', state: 'PAUSED' });
    } catch (err) {
      patchSession({ errorMessage: toMessage(err) });
    }
  }, [patchSession]);

  const resume = useCallback(async () => {
    const sid = sessionIdRef.current;
    const token = tokenRef.current;
    if (sid === null || token === null || sessions.current === null || !pausedRef.current) {
      return;
    }
    try {
      await sessions.current?.resume(sid, token);
      if (pauseStartRef.current !== null) {
        totalPausedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      pausedRef.current = false;
      patchSession({ phase: 'typing', state: 'RUNNING' });
    } catch (err) {
      patchSession({ errorMessage: toMessage(err) });
    }
  }, [patchSession]);

  const abandon = useCallback(async () => {
    const sid = sessionIdRef.current;
    const token = tokenRef.current;
    if (sid === null || token === null || sessions.current === null) {
      return;
    }
    try {
      await sessions.current?.abandon(sid, token);
      submittedRef.current = true;
      patchSession({ phase: 'idle', state: 'ABANDONED', sessionId: null });
    } catch (err) {
      patchSession({ errorMessage: toMessage(err) });
    }
  }, [patchSession]);

  const submit = useCallback(async () => {
    if (sessionIdRef.current === null) {
      return;
    }
    submittedRef.current = true;
    await doSubmit();
  }, [doSubmit]);

  const reset = useCallback(() => {
    setSession({
      phase: 'idle',
      lesson: null,
      sessionId: null,
      token: null,
      state: null,
      stats: EMPTY_STATS,
      progress: 0,
      position: 0,
      errorIndexes: [],
      composition: '',
      result: null,
      lastInsecureKeys: [],
      errorMessage: null,
    });
  }, []);

  return {
    ...session,
    start,
    handleInput,
    handleBackspace,
    handleCompositionChange,
    handleCompositionEnd,
    pause,
    resume,
    abandon,
    submit,
    reset,
  };
}

function toMessage(err: unknown): string {
  if (err instanceof Error && 'status' in err) {
    const apiError = err as ApiError;
    return apiError.message;
  }
  return err instanceof Error ? err.message : 'Erro inesperado';
}
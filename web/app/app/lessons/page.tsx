'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth-provider';
import TypingInterface from '@/components/typing-interface';
import InfoTip from '@/components/info-tip';
import { useTypingSession } from '@/hooks/use-typing-session';
import { PEDAGOGICAL_PHASE_ORDER, phaseInfo, phaseOrder } from '@/lib/pedagogical';
import type { LessonDTO, LessonPerformanceDTO, LessonPerformanceStatus } from '@/models/lesson';
import type { GetNextPedagogicalLessonResponseDTO } from '@/models/pedagogical';
import { createControllers } from '@/controllers';

const ERGONOMIC_LOCAL_FLAG = 'ott-ergo-done';

export default function LessonsPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [lessons, setLessons] = useState<LessonDTO[]>([]);
  const [performance, setPerformance] = useState<LessonPerformanceDTO[]>([]);
  const [nextLesson, setNextLesson] = useState<GetNextPedagogicalLessonResponseDTO | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentLesson, setCurrentLesson] = useState<LessonDTO | null>(null);
  const [ergoRequest, setErgoRequest] = useState<{ open: boolean; lesson: LessonDTO | null }>({
    open: false,
    lesson: null,
  });
  const session = useTypingSession();

  useEffect(() => {
    if (loading || token === null) {
      return;
    }
    let cancelled = false;
    const controllers = createControllers();
    Promise.all([
      controllers.lessons.list(token),
      controllers.pedagogical.getNextLesson(token),
      controllers.lessons.getPerformance(token),
    ])
      .then(([items, next, perf]) => {
        if (!cancelled) {
          setLessons(items);
          setNextLesson(next);
          setPerformance(perf);
          setFetchError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Falha ao carregar lições');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, token, reloadKey]);

  const ergonomicDone = useCallback((): boolean => {
    if (typeof localStorage === 'undefined' || user === null) {
      return false;
    }
    return localStorage.getItem(`${ERGONOMIC_LOCAL_FLAG}:${user.id}`) === 'true';
  }, [user]);

  const startSession = useCallback(
    (lesson: LessonDTO) => {
      if (token === null) {
        return;
      }
      setCurrentLesson(lesson);
      void session.start(lesson.id, lesson, token);
    },
    [session, token],
  );

  const handleStart = useCallback(
    (lesson: LessonDTO) => {
      if (ergonomicDone()) {
        startSession(lesson);
      } else {
        setErgoRequest({ open: true, lesson });
      }
    },
    [ergonomicDone, startSession],
  );

  const handleBack = useCallback(() => {
    session.reset();
    setFetchError(null);
    setReloadKey((k) => k + 1);
  }, [session]);

  const handleRepeat = useCallback(() => {
    if (currentLesson !== null && token !== null) {
      void session.start(currentLesson.id, currentLesson, token);
    }
  }, [currentLesson, session, token]);

  const handleAdvance = useCallback(
    (lesson: LessonDTO) => {
      setReloadKey((k) => k + 1);
      startSession(lesson);
    },
    [startSession],
  );

  if (loading) {
    return <p className="py-8 text-ink-subtle">Carregando…</p>;
  }

  if (user === null) {
    return <p className="py-8 text-ink-subtle">Você não está autenticado.</p>;
  }

  const isInSession = session.phase !== 'idle';

  if (isInSession) {
    if (session.phase === 'break') {
      return <BreakOverlay remainingMs={session.breakRemainingMs} />;
    }
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{session.lesson?.title ?? 'Sessão de digitação'}</h1>
        <TypingInterface
          session={session}
          onBack={handleBack}
          onRepeatLesson={handleRepeat}
          onAdvanceLesson={handleAdvance}
        />
      </div>
    );
  }

  const isUnlocked = (lesson: LessonDTO): boolean => {
    if (nextLesson === null) {
      return false;
    }
    if (nextLesson.reason === 'complete') {
      return true;
    }
    const frontier = nextLesson.lesson;
    if (frontier === null) {
      return false;
    }
    const lessonPhase = phaseOrder(lesson.pedagogicalPhase);
    const frontierPhase = phaseOrder(frontier.pedagogicalPhase);
    if (lessonPhase < frontierPhase) {
      return true;
    }
    if (lessonPhase === frontierPhase) {
      return (lesson.lessonInPhase ?? 0) <= (frontier.lessonInPhase ?? 0);
    }
    return false;
  };

  const isNext = (lesson: LessonDTO): boolean => nextLesson?.lesson?.id === lesson.id;

  // RN32 - status visual por lição (NOT_STARTED/PRACTICING/REVIEW/MASTERED)
  const statusByLesson = new Map(performance.map((p) => [p.lessonId, p.status]));

  const plainLessons = lessons.filter((lesson) => phaseInfo(lesson.pedagogicalPhase) === null);
  const groups = PEDAGOGICAL_PHASE_ORDER.map((phase) => ({
    phase,
    lessons: lessons.filter((lesson) => lesson.pedagogicalPhase === phase),
  })).filter((group) => group.lessons.length > 0);

  const groupedLessons = [
    ...groups.map((group) => ({ ...group, key: group.phase })),
    ...(plainLessons.length > 0
      ? [{ phase: 'OUTROS' as const, lessons: plainLessons, key: 'OUTROS' }]
      : []),
  ];

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lições</h1>
        {nextLesson !== null && nextLesson.reason === 'complete' && (
          <span className="rounded-full bg-chip-success-bg px-3 py-1 text-sm font-medium text-chip-success-fg">
            Currículo concluído
          </span>
        )}
      </div>
      <p className="mt-1 text-ink-subtle">
        Siga as fases em ordem. As lições das fases seguintes são liberadas conforme você avança.
      </p>
      {fetchError !== null && (
        <p className="mt-4 rounded-md bg-danger-bg px-4 py-2 text-sm text-danger-fg">{fetchError}</p>
      )}
      {!fetchError && lessons.length === 0 && (
        <p className="mt-4 text-ink-subtle">Nenhuma lição disponível.</p>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {groupedLessons.map((group) => {
          const info = group.key === 'OUTROS' ? null : phaseInfo(group.key);
          const hasAnyUnlocked = group.lessons.some(isUnlocked);
          const groupIsLocked = !hasAnyUnlocked && nextLesson?.reason !== 'complete';
          return (
            <section key={group.key} className="rounded-lg border border-hairline bg-surface-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-muted">
                  {info?.label ?? 'Outras lições'}
                  {info !== null && <InfoTip text={info.description} />}
                </h2>
                <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                  <span>{group.lessons.length} lições</span>
                  {groupIsLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-chip-neutral-bg px-2 py-0.5 text-chip-neutral-fg">
                      <span aria-hidden="true">🔒</span> Bloqueada
                    </span>
                  )}
                </div>
              </div>
              {groupIsLocked ? (
                <p className="mt-3 text-sm text-ink-subtle">
                  Conclua a fase anterior para liberar esta fase.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {group.lessons.map((lesson) => {
                    const unlocked = isUnlocked(lesson);
                    const next = isNext(lesson);
                    return (
                      <li
                        key={lesson.id}
                        className={`flex items-center justify-between rounded-md px-3 py-2 ${
                          next ? 'border border-primary bg-chip-info-bg' : 'bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {next && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                              Próxima lição
                            </span>
                          )}
                          {!next && statusByLesson.get(lesson.id) !== 'NOT_STARTED' && (
                            <StatusBadge status={statusByLesson.get(lesson.id) ?? 'NOT_STARTED'} />
                          )}
                          <p className={unlocked ? 'font-medium text-ink' : 'text-ink-tertiary'}>
                            {lesson.title}
                          </p>
                        </div>
                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => handleStart(lesson)}
                            className="rounded-md bg-primary px-4 py-1.5 text-sm text-white"
                          >
                            Praticar
                          </button>
                        ) : (
                          <span className="rounded-md border border-hairline px-4 py-1.5 text-sm text-ink-tertiary">
                            Bloqueada
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <ErgonomicCheckModal
        open={ergoRequest.open}
        token={token}
        userId={user.id}
        lesson={ergoRequest.lesson}
        onCancel={() => setErgoRequest({ open: false, lesson: null })}
        onApproved={(lesson) => {
          setErgoRequest({ open: false, lesson: null });
          startSession(lesson);
        }}
      />
    </div>
  );
}

interface ErgonomicCheckModalProps {
  open: boolean;
  token: string | null;
  lesson: LessonDTO | null;
  userId: string;
  onCancel: () => void;
  onApproved: (lesson: LessonDTO) => void;
}

function ErgonomicCheckModal({
  open,
  token,
  lesson,
  userId,
  onCancel,
  onApproved,
}: ErgonomicCheckModalProps): ReactNode {
  const [seatHeightOk, setSeatHeightOk] = useState(false);
  const [lumbarSupportOk, setLumbarSupportOk] = useState(false);
  const [monitorAtEyeLevel, setMonitorAtEyeLevel] = useState(false);
  const [wristSupportOk, setWristSupportOk] = useState(false);
  const [discomfortReported, setDiscomfortReported] = useState(false);
  const [discomfortDetail, setDiscomfortDetail] = useState('');
  const [guidance, setGuidance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSeatHeightOk(false);
      setLumbarSupportOk(false);
      setMonitorAtEyeLevel(false);
      setWristSupportOk(false);
      setDiscomfortReported(false);
      setDiscomfortDetail('');
      setGuidance(null);
    }
  }, [open]);

  if (!open || token === null || lesson === null) {
    return null;
  }

  const target = lesson;
  const authToken = token;

  async function handleSubmit(): Promise<void> {
    setBusy(true);
    setGuidance(null);
    try {
      const result = await createControllers().pedagogical.ergonomicCheck(
        {
          seatHeightOk,
          lumbarSupportOk,
          monitorAtEyeLevel,
          wristSupportOk,
          discomfortReported,
          ...(discomfortReported && discomfortDetail !== '' ? { discomfortDetail } : {}),
        },
        authToken,
      );
      if (!result.safe) {
        setGuidance(result.guidance);
        setBusy(false);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${ERGONOMIC_LOCAL_FLAG}:${userId}`, 'true');
      }
      setBusy(false);
      onApproved(target);
    } catch (err) {
      setGuidance(err instanceof Error ? err.message : 'Falha no check-in ergonômico');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-1 p-6 shadow-xl">
        <h2 className="text-lg font-bold">Check-in ergonômico</h2>
        <p className="mt-1 text-sm text-ink-subtle">
          Antes da primeira sessão, ajuste sua postura:
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={seatHeightOk} onChange={(e) => setSeatHeightOk(e.target.checked)} />
            Pés apoiados no chão com a cadeira na altura certa
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={lumbarSupportOk} onChange={(e) => setLumbarSupportOk(e.target.checked)} />
            Apoio lombar ajustado, costas eretas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={monitorAtEyeLevel} onChange={(e) => setMonitorAtEyeLevel(e.target.checked)} />
            Monitor na altura dos olhos, a um braço de distância
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={wristSupportOk} onChange={(e) => setWristSupportOk(e.target.checked)} />
            Pulsos apoiados sem flexão sobre o teclado
          </label>
        </div>

        <div className="mt-4 rounded-md bg-surface-2 p-3 text-sm">
          <label className="flex items-center gap-2 font-medium text-ink-muted">
            <input
              type="checkbox"
              checked={discomfortReported}
              onChange={(e) => setDiscomfortReported(e.target.checked)}
            />
            Estou sentindo dor, formigamento ou dormência
          </label>
          {discomfortReported && (
            <p className="mt-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              Interrompa imediatamente, faça uma pausa, alongue e hidrate-se. Só retome quando o desconforto passar.
            </p>
          )}
          {!discomfortReported && (
            <textarea
              value={discomfortDetail}
              onChange={(e) => setDiscomfortDetail(e.target.value)}
              placeholder="Opcional: ajustes ou observações sobre sua posição"
              className="mt-2 w-full rounded-md border border-hairline-strong bg-surface-1 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
            />
          )}
        </div>

        {guidance !== null && (
          <p className="mt-3 rounded-md bg-chip-warning-bg px-3 py-2 text-sm text-chip-warning-fg">{guidance}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-hairline-strong px-4 py-2 text-sm text-ink-muted">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || discomfortReported || !seatHeightOk || !lumbarSupportOk || !monitorAtEyeLevel || !wristSupportOk}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Verificando…' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// RN32 - badge de status visual por lição, com cores por estado.
const STATUS_BADGE_LABEL: Record<LessonPerformanceStatus, string> = {
  NOT_STARTED: 'Não iniciada',
  PRACTICING: 'Em prática',
  REVIEW: 'Revisar',
  MASTERED: 'Dominada',
};

const STATUS_BADGE_CLASS: Record<LessonPerformanceStatus, string> = {
  NOT_STARTED: 'bg-chip-neutral-bg text-chip-neutral-fg',
  PRACTICING: 'bg-chip-info-bg text-chip-info-fg',
  REVIEW: 'bg-chip-warning-bg text-chip-warning-fg',
  MASTERED: 'bg-chip-success-bg text-chip-success-fg',
};

function StatusBadge({ status }: { status: LessonPerformanceStatus }): ReactNode {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_BADGE_LABEL[status]}
    </span>
  );
}

function user(): { id: string } | null {
  throw new Error('unused');
}

// RN33 - overlay de pausa obrigatória: countdown até liberar o Start.
// breakRemainingMs vem do servidor (já deduzido); nenhuma RN no cliente.
function BreakOverlay({ remainingMs }: { remainingMs: number }): ReactNode {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Hora de descansar</h2>
      <p className="max-w-md text-ink-muted">
        Apoie as mãos no colo e alongue os braços e as pernas. A pausa é importante
        para prevenir desconforto — beba água e mexa o corpo.
      </p>
      <p className="text-sm text-ink-tertiary">A próxima lição estará disponível em</p>
      <p className="font-mono text-4xl font-bold text-primary">
        {`${minutes}:${String(seconds).padStart(2, '0')}`}
      </p>
    </div>
  );
}
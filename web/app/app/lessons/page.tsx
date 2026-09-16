'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth-provider';
import TypingInterface from '@/components/typing-interface';
import InfoTip from '@/components/info-tip';
import { useTypingSession } from '@/hooks/use-typing-session';
import { PEDAGOGICAL_PHASE_ORDER, phaseInfo, phaseOrder } from '@/lib/pedagogical';
import type { LessonDTO } from '@/models/lesson';
import type { GetNextPedagogicalLessonResponseDTO } from '@/models/pedagogical';
import { createControllers } from '@/controllers';

const ERGONOMIC_LOCAL_FLAG = 'ott-ergo-done';

export default function LessonsPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [lessons, setLessons] = useState<LessonDTO[]>([]);
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
    Promise.all([controllers.lessons.list(token), controllers.pedagogical.getNextLesson(token)])
      .then(([items, next]) => {
        if (!cancelled) {
          setLessons(items);
          setNextLesson(next);
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
    return <p className="py-8 text-slate-500">Carregando…</p>;
  }

  if (user === null) {
    return <p className="py-8 text-slate-500">Você não está autenticado.</p>;
  }

  const isInSession = session.phase !== 'idle';

  if (isInSession) {
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
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Currículo concluído
          </span>
        )}
      </div>
      <p className="mt-1 text-slate-500">
        Siga as fases em ordem. As lições das fases seguintes são liberadas conforme você avança.
      </p>
      {fetchError !== null && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{fetchError}</p>
      )}
      {!fetchError && lessons.length === 0 && (
        <p className="mt-4 text-slate-500">Nenhuma lição disponível.</p>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {groupedLessons.map((group) => {
          const info = group.key === 'OUTROS' ? null : phaseInfo(group.key);
          const hasAnyUnlocked = group.lessons.some(isUnlocked);
          const groupIsLocked = !hasAnyUnlocked && nextLesson?.reason !== 'complete';
          return (
            <section key={group.key} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-600">
                  {info?.label ?? 'Outras lições'}
                  {info !== null && <InfoTip text={info.description} />}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{group.lessons.length} lições</span>
                  {groupIsLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      <span aria-hidden="true">🔒</span> Bloqueada
                    </span>
                  )}
                </div>
              </div>
              {groupIsLocked ? (
                <p className="mt-3 text-sm text-slate-500">
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
                          next ? 'border border-indigo-200 bg-indigo-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {next && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                              Próxima lição
                            </span>
                          )}
                          <p className={unlocked ? 'font-medium text-slate-800' : 'text-slate-400'}>
                            {lesson.title}
                          </p>
                        </div>
                        {unlocked ? (
                          <button
                            type="button"
                            onClick={() => handleStart(lesson)}
                            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white"
                          >
                            Praticar
                          </button>
                        ) : (
                          <span className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-400">
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Check-in ergonômico</h2>
        <p className="mt-1 text-sm text-slate-500">
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

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <label className="flex items-center gap-2 font-medium text-slate-700">
            <input
              type="checkbox"
              checked={discomfortReported}
              onChange={(e) => setDiscomfortReported(e.target.checked)}
            />
            Estou sentindo dor, formigamento ou dormência
          </label>
          {discomfortReported && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Interrompa imediatamente, faça uma pausa, alongue e hidrate-se. Só retome quando o desconforto passar.
            </p>
          )}
          {!discomfortReported && (
            <textarea
              value={discomfortDetail}
              onChange={(e) => setDiscomfortDetail(e.target.value)}
              placeholder="Opcional: ajustes ou observações sobre sua posição"
              className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none"
              rows={2}
            />
          )}
        </div>

        {guidance !== null && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{guidance}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || discomfortReported || !seatHeightOk || !lumbarSupportOk || !monitorAtEyeLevel || !wristSupportOk}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Verificando…' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function user(): { id: string } | null {
  throw new Error('unused');
}
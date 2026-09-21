'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';
import InfoTip from '@/components/info-tip';
import { getMetricHelp, MASTERY_HELP } from '@/lib/metric-help';
import type { GetUserProgressDTO, KeyPerformanceDTO } from '@/models/progress';
import { createControllers } from '@/controllers';

const MASTERY_LABELS: Record<KeyPerformanceDTO['masteryState'], string> = {
  UNKNOWN: 'Desconhecido',
  LEARNING: 'Aprendendo',
  CONSOLIDATING: 'Consolidando',
  MASTERED: 'Dominado',
  WEAK: 'Fraco',
};

const MASTERY_STYLES: Record<KeyPerformanceDTO['masteryState'], string> = {
  UNKNOWN: 'bg-chip-neutral-bg text-chip-neutral-fg',
  LEARNING: 'bg-chip-warning-bg text-chip-warning-fg',
  CONSOLIDATING: 'bg-chip-info-bg text-chip-info-fg',
  MASTERED: 'bg-chip-success-bg text-chip-success-fg',
  WEAK: 'bg-chip-danger-bg text-chip-danger-fg',
};

export default function ProgressPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [progress, setProgress] = useState<GetUserProgressDTO | null>(null);
  const [keys, setKeys] = useState<KeyPerformanceDTO[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchProgressData = useCallback(async (): Promise<{
    progress: GetUserProgressDTO;
    keys: KeyPerformanceDTO[];
  }> => {
    if (token === null) {
      throw new Error('Você não está autenticado.');
    }
    const controllers = createControllers();
    const [progressResult, keysResult] = await Promise.all([
      controllers.progress.getProgress(token),
      controllers.progress.getKeyPerformance(token),
    ]);
    return { progress: progressResult, keys: keysResult };
  }, [token]);

  useEffect(() => {
    if (loading || token === null) {
      return;
    }
    let cancelled = false;
    fetchProgressData()
      .then(({ progress: progressResult, keys: keysResult }) => {
        if (!cancelled) {
          setProgress(progressResult);
          setKeys(keysResult);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar o progresso');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, token, fetchProgressData]);

  const handleReset = useCallback(async (): Promise<void> => {
    if (token === null) {
      return;
    }
    setResetting(true);
    setErrorMessage(null);
    try {
      const controllers = createControllers();
      await controllers.progress.resetProgress(token);
      const { progress: progressResult, keys: keysResult } = await fetchProgressData();
      setProgress(progressResult);
      setKeys(keysResult);
      setShowResetConfirm(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao limpar o progresso');
    } finally {
      setResetting(false);
    }
  }, [token, fetchProgressData]);

  const formatDate = useCallback((iso: string | null): string => {
    if (iso === null) {
      return '—';
    }
    const date = new Date(iso);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }, []);

  if (loading) {
    return <p className="py-8 text-ink-subtle">Carregando…</p>;
  }

  if (user === null) {
    return <p className="py-8 text-ink-subtle">Você não está autenticado.</p>;
  }

  const completion = Math.round((progress?.levelCompletionRate ?? 0) * 100);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-bold">Progresso</h1>
      {errorMessage !== null && (
        <p className="rounded-md bg-danger-bg px-4 py-2 text-sm text-danger-fg">{errorMessage}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Nível atual" value={String(progress?.currentLevel ?? 1)} />
        <SummaryCard label="Lições completadas" value={String(progress?.completedLessons ?? 0)} />
        <SummaryCard label="Progresso do nível" value={`${completion}%`} />
        <SummaryCard label="Última sessão" value={formatDate(progress?.lastCompletedAt ?? null)} />
      </div>

      {progress?.currentLesson !== null && progress?.currentLesson !== undefined && (
        <section className="rounded-lg border border-hairline bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-ink-subtle">Próxima lição</h2>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">{progress?.currentLesson.title}</p>
              <p className="text-sm text-ink-subtle">
                Nível {progress?.currentLesson.level} · {progress?.currentLesson.type.toLowerCase()} · Fase {progress?.currentLesson.pedagogicalPhase ?? '—'}
              </p>
            </div>
            <Link href="/app/lessons" className="rounded-md bg-primary px-4 py-2 text-sm text-white">
              Praticar
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-hairline bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-subtle">
            Desempenho por tecla (RN25)
            <InfoTip text="Como você se sai em cada tecla do seu teclado, com base nos seus treinos." />
          </h2>
          <span className="text-xs text-ink-tertiary">{keys.length} teclas · {user.activeLayout}</span>
        </div>
        {keys.length === 0 ? (
          <p className="mt-3 text-sm text-ink-subtle">
            Ainda não há dados de teclas. Complete uma sessão para gerar métricas por tecla.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="w-8 rounded-md bg-surface-3 py-1 text-center font-mono text-sm text-ink">
                    {key.logicalKey === ' ' ? '␣' : key.logicalKey}
                  </span>
                  <span className="relative inline-flex items-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MASTERY_STYLES[key.masteryState]}`}>
                      {MASTERY_LABELS[key.masteryState]}
                    </span>
                    <InfoTip text={MASTERY_HELP[key.masteryState]} />
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-ink-subtle">
                  <KeyStat label="Precisão" value={`${Math.round(key.keyAccuracy * 100)}%`} />
                  <KeyStat label="Latência" value={`${Math.round(key.averageLatencyMs)} ms`} />
                  <KeyStat label="Tentativas" value={String(key.attempts)} />
                  <KeyStat label="Score" value={String(Math.round(key.weakKeyScore * 100))} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-danger bg-danger-bg p-4">
        <h2 className="text-sm font-semibold text-danger-fg">Recomeçar do zero</h2>
        <p className="mt-1 text-sm text-danger-fg">
          Apaga todas as suas sessões, o desempenho por tecla, o cartão de progresso e o nível atual, voltando ao
          nível 1. Sua conta e seu layout de teclado são mantidos.
        </p>
        {showResetConfirm ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm font-medium text-danger-fg">Tem certeza? Esta ação não pode ser desfeita.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleReset();
                }}
                disabled={resetting}
                className="rounded-md bg-danger px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {resetting ? 'Limpando…' : 'Sim, limpar meu progresso'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                }}
                disabled={resetting}
                className="rounded-md border border-danger px-4 py-2 text-sm text-danger-fg disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowResetConfirm(true);
            }}
            className="mt-3 rounded-md border border-danger px-4 py-2 text-sm text-danger-fg"
          >
            Recomeçar do zero
          </button>
        )}
      </section>
    </div>
  );
}

function KeyStat({ label, value }: { label: string; value: string }): ReactNode {
  const help = getMetricHelp(label);
  return (
    <span className="inline-flex items-center">
      {label}: {value}
      {help !== undefined && <InfoTip text={help} />}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): ReactNode {
  const help = getMetricHelp(label);
  return (
    <div className="rounded-lg bg-surface-1 px-4 py-3">
      <p className="text-xs text-ink-subtle">
        {label}
        {help !== undefined && <InfoTip text={help} />}
      </p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
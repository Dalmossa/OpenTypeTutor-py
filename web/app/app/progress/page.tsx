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
  UNKNOWN: 'bg-slate-100 text-slate-600',
  LEARNING: 'bg-amber-100 text-amber-700',
  CONSOLIDATING: 'bg-blue-100 text-blue-700',
  MASTERED: 'bg-green-100 text-green-700',
  WEAK: 'bg-red-100 text-red-700',
};

export default function ProgressPage(): ReactNode {
  const { user, accessToken: token, loading } = useAuth();
  const [progress, setProgress] = useState<GetUserProgressDTO | null>(null);
  const [keys, setKeys] = useState<KeyPerformanceDTO[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || token === null) {
      return;
    }
    let cancelled = false;
    const controllers = createControllers();
    Promise.all([controllers.progress.getProgress(token), controllers.progress.getKeyPerformance(token)])
      .then(([progressResult, keysResult]) => {
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
  }, [loading, token]);

  const formatDate = useCallback((iso: string | null): string => {
    if (iso === null) {
      return '—';
    }
    const date = new Date(iso);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }, []);

  if (loading) {
    return <p className="py-8 text-slate-500">Carregando…</p>;
  }

  if (user === null) {
    return <p className="py-8 text-slate-500">Você não está autenticado.</p>;
  }

  const completion = Math.round((progress?.levelCompletionRate ?? 0) * 100);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-bold">Progresso</h1>
      {errorMessage !== null && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Nível atual" value={String(progress?.currentLevel ?? 1)} />
        <SummaryCard label="Lições completadas" value={String(progress?.completedLessons ?? 0)} />
        <SummaryCard label="Progresso do nível" value={`${completion}%`} />
        <SummaryCard label="Última sessão" value={formatDate(progress?.lastCompletedAt ?? null)} />
      </div>

      {progress?.currentLesson !== null && progress?.currentLesson !== undefined && (
        <section className="rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-500">Próxima lição</h2>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{progress?.currentLesson.title}</p>
              <p className="text-sm text-slate-500">
                Nível {progress?.currentLesson.level} · {progress?.currentLesson.type.toLowerCase()} · Fase {progress?.currentLesson.pedagogicalPhase ?? '—'}
              </p>
            </div>
            <Link href="/app/lessons" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Praticar
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">
            Desempenho por tecla (RN25)
            <InfoTip text="Como você se sai em cada tecla do seu teclado, com base nos seus treinos." />
          </h2>
          <span className="text-xs text-slate-400">{keys.length} teclas · {user.activeLayout}</span>
        </div>
        {keys.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Ainda não há dados de teclas. Complete uma sessão para gerar métricas por tecla.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="w-8 rounded-md bg-slate-900 py-1 text-center font-mono text-sm text-white">
                    {key.logicalKey === ' ' ? '␣' : key.logicalKey}
                  </span>
                  <span className="relative inline-flex items-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MASTERY_STYLES[key.masteryState]}`}>
                      {MASTERY_LABELS[key.masteryState]}
                    </span>
                    <InfoTip text={MASTERY_HELP[key.masteryState]} />
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
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
    <div className="rounded-lg bg-slate-900 px-4 py-3">
      <p className="text-xs text-slate-400">
        {label}
        {help !== undefined && <InfoTip text={help} />}
      </p>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
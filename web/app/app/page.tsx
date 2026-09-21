'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth-provider';

export default function AppHomePage(): ReactNode {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <p className="text-ink-subtle">Carregando…</p>;
  }

  if (user === null) {
    return (
      <div className="flex flex-col gap-4 py-16 text-center">
        <p className="text-ink-muted">Você não está autenticado.</p>
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="mx-auto rounded-md bg-primary px-4 py-2 text-white"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <p className="text-ink-muted">
        Layout ativo: {user.activeLayout} · Nível atual: {user.currentLevel}
      </p>
      <div className="flex gap-3">
        <Link
          href="/app/lessons"
          className="rounded-md bg-primary px-4 py-2 text-white"
        >
          Iniciar lição
        </Link>
        <Link
          href="/app/progress"
          className="rounded-md border border-hairline-strong px-4 py-2 text-ink-muted"
        >
          Progresso
        </Link>
        <Link
          href="/app/dashboard"
          className="rounded-md border border-hairline-strong px-4 py-2 text-ink-muted"
        >
          Dashboard
        </Link>
      </div>
      <p className="text-sm text-ink-subtle">
        Sessão de digitação, progresso por tecla e dashboard de evolução (PPM, precisão, latência).
      </p>
    </div>
  );
}
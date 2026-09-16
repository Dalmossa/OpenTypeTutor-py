'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth-provider';

export default function AppHomePage(): ReactNode {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <p className="text-slate-500">Carregando…</p>;
  }

  if (user === null) {
    return (
      <div className="flex flex-col gap-4 py-16 text-center">
        <p className="text-slate-600">Você não está autenticado.</p>
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="mx-auto rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <p className="text-slate-600">
        Layout ativo: {user.activeLayout} · Nível atual: {user.currentLevel}
      </p>
      <div className="flex gap-3">
        <Link
          href="/app/lessons"
          className="rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Iniciar lição
        </Link>
        <Link
          href="/app/progress"
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-700"
        >
          Progresso
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Tela de sessão de digitação (TASK-076) e dashboard (TASK-077) nas próximas etapas.
      </p>
    </div>
  );
}
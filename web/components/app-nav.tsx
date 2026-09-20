'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { logoutAction } from '@/app/actions/auth';
import { useAuth } from '@/components/auth-provider';

export function AppNav(): ReactNode {
  const { user } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/app" className="text-slate-900">Início</Link>
          {user !== null && (
            <>
              <Link href="/app/progress" className="text-slate-600 hover:text-slate-900">
                Progresso
              </Link>
              <Link href="/app/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
            </>
          )}
        </nav>
        {user !== null && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-700">{user.name}</span>
            <button
              type="button"
              onClick={() => void logoutAction()}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
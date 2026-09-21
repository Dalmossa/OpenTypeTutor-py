'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { logoutAction } from '@/app/actions/auth';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppNav(): ReactNode {
  const { user } = useAuth();

  return (
    <header className="border-b border-hairline bg-surface-1">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 p-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/app" className="text-ink">Início</Link>
          {user !== null && (
            <>
              <Link href="/app/progress" className="text-ink-muted hover:text-ink">
                Progresso
              </Link>
              <Link href="/app/dashboard" className="text-ink-muted hover:text-ink">
                Dashboard
              </Link>
              <Link href="/app/profile" className="text-ink-muted hover:text-ink">
                Perfil
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          {user !== null && (
            <>
              <span className="text-ink-muted">{user.name}</span>
              <button
                type="button"
                onClick={() => void logoutAction()}
                className="rounded-md border border-hairline-strong px-3 py-1.5 font-medium text-ink-muted hover:bg-surface-2"
              >
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
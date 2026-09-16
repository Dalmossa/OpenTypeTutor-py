import type { ReactNode } from 'react';

import { AuthProvider } from '@/components/auth-provider';
import { AppNav } from '@/components/app-nav';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <AuthProvider>
      <AppNav />
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </AuthProvider>
  );
}
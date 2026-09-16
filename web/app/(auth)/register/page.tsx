import type { ReactNode } from 'react';

import { AuthForm } from '@/components/auth-form';

export default function RegisterPage(): ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <AuthForm mode="register" />
    </main>
  );
}
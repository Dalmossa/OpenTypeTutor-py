import { ApiError, createApiClient } from '@/services/api-client';

export const dynamic = 'force-dynamic';

type BackendStatus =
  | { ok: true; timestamp: string }
  | { ok: false; message: string };

async function checkBackend(): Promise<BackendStatus> {
  try {
    const health = await createApiClient().getHealth();
    return health.status === 'ok'
      ? { ok: true, timestamp: health.timestamp }
      : { ok: false, message: `status inesperado: ${health.status}` };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'backend indisponível';
    return { ok: false, message };
  }
}

export default async function HomePage() {
  const status = await checkBackend();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">OpenType Tutor</h1>
      <p className="text-center text-slate-600">
        Treinador de digitação adaptativo — interface web (Fase 8).
      </p>

      <div
        className={`rounded-full px-4 py-1.5 text-sm font-medium ${
          status.ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {status.ok ? (
          <>backend conectado — {status.timestamp}</>
        ) : (
          <>frontend no ar; {status.message}</>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Login, sessão de digitação e dashboard chegam nas próximas etapas da Fase 8.
      </p>

      <nav className="flex gap-3">
        <a
          href="/login"
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white"
        >
          Entrar
        </a>
        <a
          href="/app"
          className="rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Ir para o app
        </a>
      </nav>

      <nav className="flex gap-3">
        <a
          href="/login"
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white"
        >
          Entrar
        </a>
        <a
          href="/app"
          className="rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Ir para o app
        </a>
      </nav>
    </main>
  );
}
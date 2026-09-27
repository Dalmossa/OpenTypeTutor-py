// Entry point do runtime. Toda a montagem está em `src/nestRuntime.ts` — este
// arquivo só decide a porta e o `listen`, para que o e2e e o bench possam
// montar o **mesmo** app sem abrir socket (ADR-024).

import { createNestApp, createRuntimeDataSource } from "./nestRuntime.js";

async function bootstrap(): Promise<void> {
  const dataSource = await createRuntimeDataSource();
  const app = await createNestApp(dataSource);

  const PORT = Number(process.env.PORT ?? 3000);
  await app.listen(PORT);
  console.info(
    `[server] OpenType tutor (Nest) ouvindo em http://localhost:${String(PORT)}`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error("[server] Falha ao iniciar (Nest)", error);
  process.exit(1);
});

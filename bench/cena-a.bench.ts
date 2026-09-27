import path from "path";
import fs from "fs";
import os from "os";
import { createDataSource } from "../src/infrastructure/database/data-source.js";
import {
  startBenchApp,
  buildKeystrokes,
  jsonResponse,
  postJson,
  printReferenceEnvironment,
  printReport,
  runAutocannon,
  seedCompletedSessions,
  seedLesson,
} from "./benchHarness.js";

// TASK-080 - Validar a UI Next (cena A, ADR-016) contra o RNF06 (p95 ≤ 150ms).
//
// Caminho medido (cena A): navegador → Next.js em :3000 → rewrite /api/* →
// backend (BACKEND_URL). Nada é instalado no ambiente do usuário.
//
// Como executar:
//   1. WEB_BUILD:  (cd web && BACKEND_URL=http://localhost:3101 npm run build)
//      As rewrites do Next são resolvidas no build — o BACKEND_URL deve apontar
//      para a porta do backend de benchmark usada logo abaixo.
//   2. NEXT:       (cd web && npm start)   # porta 3000, mesma build do passo 1
//   3. BENCH:      npx tsx bench/cena-a.bench.ts
//
// O backend do benchmark sobe em processo, com SQLite em arquivo (temp) e
// 500 sessões históricas do usuário de teste — mesmo ambiente de referência
// do PRD §28 (baseline TASK-065).

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface InteractiveReport {
  total: number;
  averageMs: number;
  maxMs: number;
}

async function runInteractiveSubmits(
  backendUrl: string,
  uiBase: string,
  authHeaders: Record<string, string>,
  lessonId: string,
  payload: unknown,
  count = 5,
): Promise<InteractiveReport> {
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const started = await jsonResponse(
      await postJson(backendUrl + "/sessions", authHeaders, { lessonId }),
    );
    const sessionId = (started.body as { sessionId: string }).sessionId;
    const t0 = performance.now();
    const res = await postJson(
      `${uiBase}/api/sessions/${sessionId}/submit`,
      authHeaders,
      { keystrokes: payload },
    );
    if (!res.ok) {
      throw new Error(`Submit interativo falhou (${String(res.status)})`);
    }
    times.push(performance.now() - t0);
  }
  return {
    total: times.length,
    averageMs: times.reduce((sum, t) => sum + t, 0) / times.length,
    maxMs: Math.max(...times),
  };
}

async function main(): Promise<void> {
  printReferenceEnvironment();

  const backendPort = envInt("CENA_A_BACKEND_PORT", 3101);
  const uiBase = process.env.CENA_A_UI_URL ?? "http://localhost:3000";

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opentype-cena-a-"));
  const dbFile = path.join(tempDir, "cena-a.sqlite");

  const dataSource = createDataSource({ database: dbFile });
  await dataSource.initialize();
  await dataSource.runMigrations();

  const lessonId = await seedLesson(dataSource);

  const { baseUrl: backendUrl, stop } = await startBenchApp(
    dataSource,
    backendPort,
  );

  console.info(`Backend de benchmark (temp): ${backendUrl}`);
  console.info(`UI Next (cena A): ${uiBase}/api/** → ${backendUrl}/**`);
  console.info("");

  const registered = await jsonResponse(
    await postJson(
      backendUrl + "/auth/register",
      {},
      { name: "Benchmark", email: "bench@email.com", password: "senha1234" },
    ),
  );
  if (registered.status !== 201) {
    throw new Error("Falha no registro de usuário do benchmark");
  }
  const userId = (registered.body as { userId: string }).userId;

  const loginRes = await jsonResponse(
    await postJson(
      backendUrl + "/auth/login",
      {},
      { email: "bench@email.com", password: "senha1234" },
    ),
  );
  const accessToken = (loginRes.body as { accessToken: string }).accessToken;
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  console.info(
    "Populando banco com 500 sessões completas do usuário de teste (SQLite em arquivo)...",
  );
  await seedCompletedSessions(dataSource, userId, lessonId);
  console.info("Seed concluído.");
  console.info("");

  const started = await jsonResponse(
    await postJson(backendUrl + "/sessions", authHeaders, { lessonId }),
  );
  const benchSessionId = (started.body as { sessionId: string }).sessionId;

  await new Promise((resolve) => {
    setTimeout(resolve, 3100);
  });

  const payload = buildKeystrokes(1500);
  const body = JSON.stringify({ keystrokes: payload });

  console.info(`Submit frio VIA UI (${uiBase}/api, 1500 eventos):`);
  const coldStart = performance.now();
  const coldRes = await jsonResponse(
    await postJson(
      `${uiBase}/api/sessions/${benchSessionId}/submit`,
      authHeaders,
      { keystrokes: payload },
    ),
  );
  const coldLatencyMs = performance.now() - coldStart;
  console.info(
    `  status=${String(coldRes.status)} latência=${coldLatencyMs.toFixed(1)}ms`,
  );
  console.info("");

  console.info(
    "Benchmark autocannon DIRECT no backend (10 conexões, 10s, 1500 eventos):",
  );
  const direct = await runAutocannon(
    backendUrl + `/sessions/${benchSessionId}/submit`,
    authHeaders,
    body,
  );
  printReport("", direct);
  console.info("");

  console.info(
    `Benchmark autocannon VIA UI Next (${uiBase}/api, 10 conexões, 10s, 1500 eventos):`,
  );
  const viaUi = await runAutocannon(
    `${uiBase}/api/sessions/${benchSessionId}/submit`,
    authHeaders,
    body,
  );
  printReport("", viaUi);
  console.info(
    `Overhead da UI (p95): +${(viaUi.p95Ms - direct.p95Ms).toFixed(1)}ms`,
  );
  console.info("");

  console.info(
    "Cenário interativo cena A (um usuário, submits sequenciais VIA UI, 1500 eventos, sessão nova a cada submit):",
  );
  const interactive = await runInteractiveSubmits(
    backendUrl,
    uiBase,
    authHeaders,
    lessonId,
    payload,
  );
  const interactiveFulfilled = interactive.averageMs <= 150;
  console.info("  submits: " + String(interactive.total));
  console.info(`  latência média: ${interactive.averageMs.toFixed(1)}ms`);
  console.info(`  latência pico: ${interactive.maxMs.toFixed(1)}ms`);
  console.info(
    `RNF06 cena A interativa (média ≤ 150ms): ${interactiveFulfilled ? "DENTRO DO BUDGET" : "ACIMA DO BUDGET"}`,
  );
  console.info("");

  await stop();
  await dataSource.destroy();
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch(async (error: unknown) => {
  console.error("[bench:cena-a] Falha ao executar benchmark", error);
  process.exit(1);
});

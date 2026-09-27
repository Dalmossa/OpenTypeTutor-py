import path from "path";
import fs from "fs";
import os from "os";
import { createDataSource } from "../src/infrastructure/database/data-source.js";
import {
  startBenchApp,
  jsonResponse,
  postJson,
  printReferenceEnvironment,
  printReport,
  runAutocannon,
  seedCompletedSessions,
  seedLesson,
} from "./benchHarness.js";

async function main(): Promise<void> {
  printReferenceEnvironment();

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "opentype-bench-dashboard-"),
  );
  const dbFile = path.join(tempDir, "bench-dashboard.sqlite");

  const dataSource = createDataSource({ database: dbFile });
  await dataSource.initialize();
  await dataSource.runMigrations();

  const lessonId = await seedLesson(dataSource);

  const { baseUrl, stop } = await startBenchApp(dataSource);

  const registered = await jsonResponse(
    await postJson(
      baseUrl + "/auth/register",
      {},
      {
        name: "Benchmark",
        email: "bench-dashboard@email.com",
        password: "senha1234",
      },
    ),
  );
  if (registered.status !== 201) {
    throw new Error("Falha no registro de usuário do benchmark");
  }
  const userId = (registered.body as { userId: string }).userId;

  const loginRes = await jsonResponse(
    await postJson(
      baseUrl + "/auth/login",
      {},
      { email: "bench-dashboard@email.com", password: "senha1234" },
    ),
  );
  const accessToken = (loginRes.body as { accessToken: string }).accessToken;
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  console.info(
    "Populando banco com 52 semanas (365 agregados) de dados do dashboard...",
  );
  await seedCompletedSessions(dataSource, userId, lessonId);
  console.info("Seed concluído.");
  console.info("");

  console.info("Benchmark GET /me/dashboard/habits (10 conexões, 10s):");
  const report = await runAutocannon(
    baseUrl + "/me/dashboard/habits",
    authHeaders,
    "",
    { method: "GET" },
  );
  const fulfilled = printReport("Dashboard Habits", report, 500, "RNF11");

  await stop();
  await dataSource.destroy();
  fs.rmSync(tempDir, { recursive: true, force: true });

  if (!fulfilled) {
    console.error(
      "RNF11 NÃO ATENDIDO em /me/dashboard/habits (p95 > 500ms ou requisições falhando)",
    );
    // O job `bench-dashboard` do CI roda este script. Só `console.error` saía
    // com 0, então a RNF11 não podia reprovar o pipeline: job que não falha
    // não é gate. Sai DEPOIS do cleanup, para não deixar banco e servidor
    // pendurados.
    process.exitCode = 1;
  }
}

main().catch(async (error: unknown) => {
  console.error("[bench:dashboard] Falha ao executar benchmark", error);
  process.exit(1);
});

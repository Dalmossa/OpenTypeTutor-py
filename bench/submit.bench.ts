import path from 'path';
import fs from 'fs';
import os from 'os';
import { createDataSource } from '../src/infrastructure/database/data-source.js';
import {
  buildApp,
  buildKeystrokes,
  jsonResponse,
  postJson,
  printReferenceEnvironment,
  printReport,
  runAutocannon,
  seedCompletedSessions,
  seedLesson,
} from './benchHarness.js';

async function main(): Promise<void> {
  printReferenceEnvironment();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentype-bench-'));
  const dbFile = path.join(tempDir, 'bench.sqlite');

  const dataSource = createDataSource({ database: dbFile });
  await dataSource.initialize();
  await dataSource.runMigrations();

  const lessonId = await seedLesson(dataSource);

  const app = buildApp(dataSource);
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });
  const baseUrl = `http://127.0.0.1:${String((server.address() as { port: number }).port)}`;

  const registered = await jsonResponse(
    await postJson(baseUrl + '/auth/register', {}, { name: 'Benchmark', email: 'bench@email.com', password: 'senha1234' })
  );
  if (registered.status !== 201) {
    throw new Error('Falha no registro de usuário do benchmark');
  }
  const userId = (registered.body as { userId: string }).userId;

  const loginRes = await jsonResponse(
    await postJson(baseUrl + '/auth/login', {}, { email: 'bench@email.com', password: 'senha1234' })
  );
  const accessToken = (loginRes.body as { accessToken: string }).accessToken;
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  console.info('Populando banco com 500 sessões completas do usuário de teste (SQLite em arquivo)...');
  await seedCompletedSessions(dataSource, userId, lessonId);
  console.info('Seed concluído.');
  console.info('');

  const started = await jsonResponse(
    await postJson(baseUrl + '/sessions', authHeaders, { lessonId })
  );
  const benchSessionId = (started.body as { sessionId: string }).sessionId;

  await new Promise((resolve) => {
    setTimeout(resolve, 3100);
  });

  const payload = buildKeystrokes(1500);
  const body = JSON.stringify({ keystrokes: payload });

  console.info('Submit frio (cálculo completo de métricas, 1500 eventos):');
  const coldStart = performance.now();
  const coldRes = await jsonResponse(
    await postJson(baseUrl + `/sessions/${benchSessionId}/submit`, authHeaders, { keystrokes: payload })
  );
  const coldLatencyMs = performance.now() - coldStart;
  console.info(`  status=${String(coldRes.status)} latência=${coldLatencyMs.toFixed(1)}ms`);
  console.info('');

  console.info('Benchmark autocannon (directo no backend, 10 conexões, 10s, 1500 eventos):');
  const report = await runAutocannon(baseUrl + `/sessions/${benchSessionId}/submit`, authHeaders, body);
  const fulfilled = printReport('', report);
  if (!fulfilled) {
    console.error('RNF06 NÃO ATENDIDO no acesso direto ao backend');
  }

  server.closeAllConnections();
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await dataSource.destroy();
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch(async (error: unknown) => {
  console.error('[bench] Falha ao executar benchmark', error);
  process.exit(1);
});
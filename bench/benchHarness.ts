import os from "os";
import crypto from "crypto";
import autocannon from "autocannon";
import type { Server } from "node:http";
import type { DataSource } from "typeorm";
import { SessionId } from "../src/domain/value-objects/SessionId.js";
import { Layout } from "../src/domain/value-objects/Layout.js";
import { Lesson } from "../src/domain/entities/Lesson.js";
import { SessionMetrics } from "../src/domain/entities/SessionMetrics.js";
import type { KeystrokeEventProps } from "../src/domain/entities/KeystrokeEvent.js";
import { TypeOrmLessonRepository } from "../src/infrastructure/repositories/TypeOrmLessonRepository.js";
import { createNestApp } from "../src/nestRuntime.js";
import {
  TypingSessionEntity,
  type TypingSessionRow,
} from "../src/infrastructure/database/entities/index.js";

export const BENCH_LESSON_ID = "10000000-0000-4000-8000-000000000001";

const LETTERS: Array<{ logicalKey: string; physicalKey: string }> = [
  "a",
  "s",
  "d",
  "f",
  "j",
  "k",
  "l",
].map((logicalKey) => ({
  logicalKey,
  physicalKey: `Key${logicalKey.toUpperCase()}`,
}));

export function buildKeystrokes(count: number): KeystrokeEventProps[] {
  const keystrokes: KeystrokeEventProps[] = [];
  for (let i = 0; i < count; i++) {
    const entry = LETTERS[i % LETTERS.length];
    if (entry === undefined) {
      continue;
    }
    keystrokes.push({
      expectedKey: entry.logicalKey,
      typedKey: entry.logicalKey,
      physicalKey: entry.physicalKey,
      logicalKey: entry.logicalKey,
      eventType: "CORRECT",
      timestampMs: 100 + i * 12,
      latencyMs: i % 2 === 0 ? 90 : 120,
      composedCharacter: null,
    });
  }
  return keystrokes;
}

export function printReferenceEnvironment(): void {
  const cpus = os.cpus();
  const cpuModel = (cpus[0]?.model ?? "desconhecido").trim();
  console.info("Ambiente de referência (RNF06):");
  console.info(`  OS: ${os.platform()} ${os.release()}`);
  console.info(`  CPU: ${cpuModel} (${String(cpus.length)} núcleos lógicos)`);
  console.info(`  RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GiB`);
  console.info(`  Node: ${process.version}`);
  console.info("");
}

export function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export async function jsonResponse(
  res: Response,
): Promise<{ status: number; body: unknown }> {
  const body = (await res.json()) as unknown;
  return { status: res.status, body };
}

/**
 * Sobe o app Nest de benchmarking e devolve a URL base.
 *
 * Antes de ADR-024 o bench tinha a **quarta** cópia do grafo de dependências, e
 * ela apodreceu: `new RefreshToken(tokenService)` quando o caso de uso já
 * exigia o `userRepository`, e faltavam os 6 use cases de recuperação de senha,
 * admin settings e pacing. `npm run bench` quebrava em runtime — e ninguém
 * percebia, porque o `include` do `tsconfig.json` é só `src` e o script de
 * lint é `eslint src`. Ou seja, o diretório que existe para medir desempenho
 * não era nem typecheckado.
 *
 * Montar pelo `createNestApp` elimina a possibilidade: o bench agora mede o app
 * que roda em produção, não um rascunho dele.
 */
export interface BenchApp {
  readonly baseUrl: string;
  stop(): Promise<void>;
}

export async function startBenchApp(
  dataSource: DataSource,
  port = 0,
): Promise<BenchApp> {
  const app = await createNestApp(dataSource);
  await app.listen(port);

  const address = app.getHttpServer().address();
  const boundPort =
    typeof address === "object" && address !== null ? address.port : port;

  return {
    baseUrl: `http://127.0.0.1:${String(boundPort)}`,
    async stop(): Promise<void> {
      const server = app.getHttpServer() as Server;
      // autocannon deixa conexões pendentes; sem isto o `close` não resolve e o
      // processo não sai.
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await app.close();
    },
  };
}

export async function seedLesson(dataSource: DataSource): Promise<string> {
  const lessonRepository = new TypeOrmLessonRepository(dataSource);
  const lessonId = SessionId.create(BENCH_LESSON_ID);
  await lessonRepository.save(
    Lesson.create({
      id: lessonId,
      level: 1,
      title: "Lições benchmark",
      content: "asdf jkl;",
      targetKeys: ["a", "s", "d", "f", "j", "k", "l"],
      difficulty: "GUIDED",
      type: "INTRODUCTION",
      layout: Layout.create("ABNT2"),
    }),
  );
  return lessonId.value;
}

export async function seedCompletedSessions(
  dataSource: DataSource,
  userId: string,
  lessonId: string,
): Promise<void> {
  const repo = dataSource.getRepository(TypingSessionEntity);
  const keystrokesPayload = buildKeystrokes(60);
  const now = Date.now();
  const rows: TypingSessionRow[] = Array.from({ length: 500 }, (_, index) => {
    const seededMetrics = SessionMetrics.create({
      charactersTyped: 60,
      correctCharacters: 54,
      incorrectCharacters: 6,
      correctedErrors: 4,
      finalUncorrectedErrors: 2,
      accuracy: 54 / 60,
      grossWpm: 42,
      netWpm: 38,
      activeDurationMs: 120_000,
      averageLatencyMs: 105,
    });
    return {
      id: crypto.randomUUID(),
      userId,
      lessonId,
      layout: "ABNT2",
      state: "COMPLETED",
      startedAt: new Date(now - (index + 1) * 3_600_000).toISOString(),
      completedAt: new Date(
        now - (index + 1) * 3_600_000 + 120_000,
      ).toISOString(),
      activeDurationMs: 120_000,
      metrics: JSON.stringify(seededMetrics.toJSON()),
      keystrokes: JSON.stringify(keystrokesPayload),
      pausedAt: null,
      totalPausedDurationMs: 0,
    };
  });
  await repo.save(rows);
}

export interface AutocannonReport {
  totalRequests: number;
  non2xx: number;
  requestsPerSecond: number;
  throughputKibS: number;
  averageMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p97_5Ms: number;
  p99Ms: number;
}

export async function runAutocannon(
  url: string,
  headers: Record<string, string>,
  body: string,
  options: {
    connections?: number;
    duration?: number;
    method?: "GET" | "POST";
  } = {},
): Promise<AutocannonReport> {
  const instance = autocannon({
    url,
    method: options.method ?? "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    connections: options.connections ?? 10,
    duration: options.duration ?? 10,
  });
  const responseTimes: number[] = [];
  instance.on(
    "response",
    (
      _client: unknown,
      _status: number,
      _bytes: number,
      responseTime: number,
    ) => {
      responseTimes.push(responseTime);
    },
  );
  const result = await instance;

  const sortedLatencies = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.min(
    sortedLatencies.length - 1,
    Math.floor(sortedLatencies.length * 0.95),
  );

  return {
    totalRequests: sortedLatencies.length,
    non2xx: result.non2xx,
    requestsPerSecond: result.requests.average,
    throughputKibS: result.throughput.average / 1024,
    averageMs: result.latency.average,
    p50Ms: result.latency.p50,
    p90Ms: result.latency.p90,
    p95Ms: sortedLatencies[p95Index] ?? 0,
    p97_5Ms: result.latency.p97_5,
    p99Ms: result.latency.p99,
  };
}

/**
 * Imprime o relatório e devolve `true` só se a RNF foi de fato cumprida.
 *
 * **Latência de resposta de erro é mais rápida que a de sucesso.** Um 404
 * servido em 2 ms tem p95 melhor que um 200 servido em 40 ms, então medir
 * apenas `p95` premia a falha: basta com que o alvo responda erro rápido para
 * o relatório sair "ATENDIDO". Foi exatamente o que aconteceu no `cena-a` com a
 * UI Next no ar errado — 8.815 de 8.815 requisições em non-2xx, p95 de 24,6 ms,
 * e a linha verde de RNF06. `non2xx > 0` reprova: um benchmark que mede o
 * quanto o servidor erra rápido não mede desempenho, mede a taxa de erro com
 * unidades trocadas.
 */
export function printReport(
  title: string,
  report: AutocannonReport,
  p95BudgetMs = 150,
  label = "RNF06",
): boolean {
  const withinBudget = report.p95Ms <= p95BudgetMs;
  const allSucceeded = report.non2xx === 0;
  const fulfilled = withinBudget && allSucceeded;
  if (title !== "") {
    console.info(`${title}:`);
  }
  console.info(
    `  requisições: ${String(report.totalRequests)} (non-2xx: ${String(report.non2xx)})`,
  );
  console.info(`  requisições/s: ${report.requestsPerSecond.toFixed(0)}`);
  console.info(`  throughput: ${report.throughputKibS.toFixed(1)} KiB/s`);
  console.info(`  latência média: ${report.averageMs.toFixed(1)}ms`);
  console.info(`  latência p50: ${report.p50Ms.toFixed(1)}ms`);
  console.info(`  latência p90: ${report.p90Ms.toFixed(1)}ms`);
  console.info(`  latência p95 (calculado): ${report.p95Ms.toFixed(1)}ms`);
  console.info(`  latência p97.5: ${report.p97_5Ms.toFixed(1)}ms`);
  console.info(`  latência p99: ${report.p99Ms.toFixed(1)}ms`);
  if (!allSucceeded) {
    const errorShare = (report.non2xx / report.totalRequests) * 100;
    console.info(
      `  ATENÇÃO: ${String(report.non2xx)} de ${String(report.totalRequests)} requisições ` +
        `(${errorShare.toFixed(1)}%) falharam — a latência acima é a de um servidor ` +
        `que está errando, não a de um que está atendendo.`,
    );
  }
  const verdict = fulfilled
    ? "ATENDIDO"
    : allSucceeded
      ? "NÃO ATENDIDO (latência acima do orçamento)"
      : "NÃO ATENDIDO (requisições falhando — latência não é comparável)";
  console.info(`${label} (p95 ≤ ${p95BudgetMs}ms, 0 non-2xx): ${verdict}`);
  return fulfilled;
}

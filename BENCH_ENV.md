# Ambiente de Referência para Benchmarks (RNF06 / RNF11)

> **Regra:** Este arquivo deve ser versionado e atualizado a cada mudança de hardware/software que afete o baseline. O benchmark só é comparável quando executado no mesmo ambiente documentado aqui.

---

## Hardware

| Componente      | Especificação                                                        |
| --------------- | -------------------------------------------------------------------- |
| **CPU**         | 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (4 cores / 8 threads) |
| **RAM**         | 15.4 GiB (DDR4)                                                      |
| **Disco**       | SSD NVMe (sistema de arquivos ext4)                                  |
| **Arquitetura** | x86_64                                                               |

---

## Sistema Operacional

| Item       | Versão                            |
| ---------- | --------------------------------- |
| **SO**     | Ubuntu 24.04.4 LTS (Noble Numbat) |
| **Kernel** | Linux 6.8.0-xx-generic            |
| **Shell**  | bash 5.2.21                       |

---

## Runtime e Dependências Principais

| Pacote             | Versão  | Notas                                                             |
| ------------------ | ------- | ----------------------------------------------------------------- |
| **Node.js**        | v25.4.0 | LTS atual (odd version — confirmar se LTS no momento da execução) |
| **npm**            | 9.2.0   |                                                                   |
| **TypeScript**     | 5.x     | `tsc --version`                                                   |
| **Vitest**         | 5.x     | Test runner                                                       |
| **Express**        | 5.2.1   | Backend HTTP (Fase 8: migração para Nest.js 12 em andamento)      |
| **Nest.js**        | 12.x    | Backend novo (paralelo ao Express)                                |
| **TypeORM**        | 0.3.x   | ORM                                                               |
| **better-sqlite3** | 12.11.1 | Driver SQLite nativo (compilado)                                  |
| **SQLite**         | 3.45.x  | Biblioteca embutida no better-sqlite3                             |
| **bcrypt**         | 6.0.0   | Hash de senhas                                                    |
| **jsonwebtoken**   | 9.0.3   | JWT                                                               |
| **pino**           | 9.x     | Logger                                                            |
| **zod**            | 3.x     | Validação                                                         |
| **autocannon**     | 8.x     | Benchmark HTTP                                                    |

---

## Configuração do Banco de Dados (SQLite)

| Parâmetro        | Valor                                                   | Fonte                        |
| ---------------- | ------------------------------------------------------- | ---------------------------- |
| **Journal Mode** | WAL (`PRAGMA journal_mode=WAL`)                         | ADR-012, `databaseParams.ts` |
| **Busy Timeout** | 5000 ms                                                 | ADR-012, `databaseParams.ts` |
| **Foreign Keys** | ON (`PRAGMA foreign_keys=ON`)                           | ADR-012                      |
| **Synchronous**  | NORMAL (default WAL)                                    | SQLite default               |
| **Arquivo**      | Temporário em `/tmp/opentype-bench-XXXXXX/bench.sqlite` | `bench/submit.bench.ts`      |
| **Encoding**     | UTF-8                                                   | SQLite default               |

---

## Dataset de Seed para Benchmark

| Dataset                   | Descrição                                              | Geração                                       |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| **Usuário**               | 1 usuário: `bench@email.com` / `senha1234`             | `bench/submit.bench.ts:36-42`                 |
| **Lição**                 | 1 lição nível 1, conteúdo fixo                         | `bench/benchHarness.ts:seedLesson`            |
| **Sessões completas**     | **500 sessões** do usuário de teste, variando métricas | `bench/benchHarness.ts:seedCompletedSessions` |
| **Keystrokes por sessão** | 1500 eventos (payload do submit benchmarkado)          | `bench/benchHarness.ts:buildKeystrokes(1500)` |

> **Hash do dataset (para reprodutibilidade):**
>
> ```bash
> # Após rodar seedCompletedSessions, execute:
> sha256sum /tmp/opentype-bench-*/bench.sqlite
> ```
>
> Registrar o hash aqui quando baseline for estabelecido.

---

## Parâmetros do Benchmark RNF06 (submit)

| Parâmetro                 | Valor                                               |
| ------------------------- | --------------------------------------------------- |
| **Endpoint**              | `POST /sessions/:id/submit`                         |
| **Payload**               | 1500 `KeystrokeEvent` (JSON ~150 KB)                |
| **Ferramenta**            | `autocannon` (Node.js library, sem binário externo) |
| **Conexões concorrentes** | 10                                                  |
| **Duração**               | 10 segundos                                         |
| **Métrica alvo**          | **p95 ≤ 150 ms**                                    |
| **Critério de aceite**    | `fulfilled: true` no relatório `printReport`        |

---

## Parâmetros do Benchmark RNF11 (dashboard)

| Parâmetro                 | Valor                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| **Endpoint**              | `GET /me/dashboard/habits` (pior caso: agrega 365 dias)               |
| **Seed**                  | 52 semanas = 365 `DailyMetricsAggregate` do usuário                   |
| **Ferramenta**            | `autocannon`                                                          |
| **Conexões concorrentes** | 10                                                                    |
| **Duração**               | 10 segundos                                                           |
| **Métrica alvo**          | **p95 ≤ 500 ms**                                                      |
| **Script**                | `npm run bench:dashboard` (a implementar: `bench/dashboard.bench.ts`) |

---

## Como Reproduzir

```bash
# 1. Garantir dependências
npm ci

# 2. Build (necessário para TypeScript → dist/)
npm run build

# 3. Rodar benchmark RNF06 (submit)
npm run bench

# 4. Rodar benchmark RNF11 (dashboard) — quando implementado
npm run bench:dashboard
```

---

## Baseline Atual (Registrado em 2026-09-19)

| Benchmark                              | p50     | p90       | p95           | p99       | Status                               |
| -------------------------------------- | ------- | --------- | ------------- | --------- | ------------------------------------ |
| **RNF06 submit (direto backend)**      | ~12 ms  | ~35 ms    | **~40 ms**    | ~80 ms    | ✅ **ATENDIDO** (≤150 ms)            |
| **RNF06 submit (via Next.js rewrite)** | ~120 ms | ~2,800 ms | **~4,800 ms** | ~8,000 ms | ❌ NÃO ATENDIDO (gargalo proxy Next) |
| **RNF11 dashboard**                    | —       | —         | —             | —         | ⏳ Pendente implementação            |

> **Nota:** O RNF06 do PRD mede o **endpoint da API** (backend direto). O caminho via Next.js rewrite `/api/*` é documentado como limitação conhecida (TASK-080). Em produção, o cliente Next usa `NEXT_PUBLIC_API_URL` para chamar o backend diretamente, contornando o proxy.

---

## Checklist de Validação Antes de Commitar Mudança no BENCH_ENV.md

- [ ] Hardware/OS inalterado desde último baseline?
- [ ] Versões de Node.js, better-sqlite3, SQLite iguais?
- [ ] Dataset seed (500 sessões) gerado pelo mesmo script?
- [ ] `npm run bench` roda sem erros e atende p95 ≤ 150ms?
- [ ] Hash do arquivo SQLite do seed registrado acima?
- [ ] Mudança documentada com data e responsável?

---

**Responsável pelo baseline:** Dalmo Pereira  
**Última atualização:** 2026-09-19  
**Próxima revisão:** Após qualquer upgrade de Node.js, better-sqlite3, ou mudança de hardware.

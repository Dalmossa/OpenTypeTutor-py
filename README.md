# OpenType Tutor

[![CI Pipeline](https://github.com/Dalmossa/OpenTypeTutor-py/actions/workflows/ci.yml/badge.svg)](https://github.com/Dalmossa/OpenTypeTutor-py/actions/workflows/ci.yml)

Treinador de digitação com **prática adaptativa**: um backend REST que acompanha o desempenho individual por tecla, identifica dificuldades e gera automaticamente as próximas atividades, mais uma UI web (Next.js) que consome essa API.

Projeto **web único** — o cliente desktop (Python/customtkinter) foi descontinuado (ADR-022).

---

## Stack

| Camada       | Tecnologia                                                   |
| ------------ | ------------------------------------------------------------ |
| Runtime      | Node.js ≥ 20 (CI usa 22) + TypeScript `strict`               |
| HTTP         | Express 5 (bootstrap via `@nestjs/platform-express`)         |
| Persistência | TypeORM + SQLite (`better-sqlite3`), migrações versionadas   |
| Validação    | Zod                                                          |
| Autenticação | bcrypt (12 rounds) + JWT (access 15m / refresh 30d rotativo) |
| Logs         | pino                                                         |
| Testes       | Vitest (cobertura mínima 90% no domínio)                     |
| Lint/Format  | ESLint 9 flat config + `eslint-plugin-boundaries` + Prettier |
| Hooks git    | Husky + commitlint (Conventional Commits) + lint-staged      |
| Benchmark    | autocannon (RNF06 submit, RNF11 dashboard)                   |
| UI web       | Next.js 15 (App Router) + React 19 + Tailwind 4 + Recharts   |

---

## Pré-requisitos

- Node.js ≥ 20 (recomendado 22) e npm.
- Nenhum banco externo: SQLite em arquivo local (`./data/opentype.sqlite` por padrão).

## Instalação e execução

```bash
# clonar
git clone https://github.com/Dalmossa/OpenTypeTutor-py.git
cd OpenTypeTutor-py

# dependências
npm install                 # backend
npm --prefix web install    # UI web

# banco (schema + seed do currículo de lições)
npm run migrate

# dev
npm run dev                 # API em http://localhost:3000
npm run dev:web             # UI web (Next.js) em outra aba/terminal

# produção
npm run build
npm start                   # roda a partir de dist/
```

> Em dev, a porta da web é incrementada automaticamente se a 3000 já estiver ocupada. Para resolver a API em outra porta: `PORT=3001 npm run dev` e aponte a web para ela via `web/.env` (ver `web/.env.example`).

## Variáveis de ambiente

### Backend (todas opcionais em dev)

| Variável       | Padrão                    | Descrição                                           |
| -------------- | ------------------------- | --------------------------------------------------- |
| `PORT`         | `3000`                    | Porta da API                                        |
| `DB_PATH`      | `./data/opentype.sqlite`  | Caminho do banco SQLite                             |
| `JWT_SECRET`   | `dev-secret-…` (fallback) | Segredo JWT. **Obrigatório configurar em produção** |
| `CORS_ORIGINS` | —                         | Origens permitidas (separadas por vírgula)          |
| `NODE_ENV`     | —                         | Ambiente (development/production/test)              |

### Web

| Variável      | Padrão                  | Descrição                                     |
| ------------- | ----------------------- | --------------------------------------------- |
| `BACKEND_URL` | `http://localhost:3000` | Endereço da API REST (ver `web/.env.example`) |

## Scripts

| Comando                          | Ação                                       |
| -------------------------------- | ------------------------------------------ |
| `npm run dev`                    | API com hot reload (`tsx watch`)           |
| `npm run build`                  | Compila TypeScript para `dist/`            |
| `npm start`                      | Executa a build em `dist/`                 |
| `npm run lint` / `lint:fix`      | ESLint strict (fronteiras de camada)       |
| `npm run typecheck`              | Type-check sem emitir                      |
| `npm run test` / `test:watch`    | Vitest (uma vez / watch)                   |
| `npm run test:coverage`          | Cobertura (v8; ≥90% no domínio)            |
| `npm run migrate`                | Aplica migrações do banco (schema + seeds) |
| `npm run bench`                  | Benchmark de submit (RNF06)                |
| `npm run bench:dashboard`        | Benchmark do dashboard (RNF11)             |
| `npm --prefix web run dev`       | UI web em dev                              |
| `npm --prefix web run build`     | Build de produção da web                   |
| `npm --prefix web run lint`      | ESLint da web (`--max-warnings 0`)         |
| `npm --prefix web run typecheck` | Type-check da web                          |
| `npm --prefix web run test`      | Testes da web                              |

Ordem do CI (gate de qualidade): **lint → typecheck → test**, depois bench.

## Arquitetura

Clean Architecture + DDD, com a regra de dependência **imposta por lint** (`eslint-plugin-boundaries` — violação quebra o build):

```
src/
├── domain/           # Lógica de negócio pura — SEM dependências externas
│   ├── config/       #   parâmetros adaptativos
│   ├── entities/     #   User, TypingSession, KeyPerformance, Progress, Lesson
│   ├── value-objects/#   Email, Layout, SessionId
│   ├── services/     #   MetricsEngine, AdaptiveLessonEngine, ProgressionEngine
│   ├── repositories/ #   interfaces apenas (IUserRepository, …)
│   └── errors/       #   DomainError subclasses
├── application/      # Casos de uso + DTOs (orquestra domínio + interfaces de repo)
├── infrastructure/   # Implementações (TypeORM, SQLite, bcrypt, JWT, pino)
├── presentation/     # Express, controllers, rotas, middlewares, validators
└── shared/           # AppError, catálogo de erros (pt-BR), ERROR_CODES
```

Regra de dependência: `presentation → application → domain ← infrastructure` — o domínio **nunca** importa `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod` nem `pino`.

A UI web segue o protocolo MVC de apresentação (ADR-018) e **não contém regras de negócio** — só consome REST. Os modelos de UI são DTOs, nunca entidades de domínio.

## Funcionalidades

- **Autenticação** — registro/login com bcrypt (12 rounds), JWT de curto prazo (15m) + refresh rotativo (30d), rate limiting em `/auth/login` e `/auth/refresh`.
- **Sessões de digitação** — ciclo de vida completo (iniciar, pausar, retomar, submeter, abandonar); submit **idempotente** (RN14) e com descarte de dados insuficientes (RN22).
- **Métricas** — WPM, precisão e latência por tecla; erros finais não corrigidos `max(0, errors − corrections)` (RN21); latência de dead-keys medida do primeiro compose ao último keydown.
- **Motor adaptativo** — WeakKeyScore, pesos neural-like, pools de reforço com arredondamento determinístico por maior resto e desempate `WEAK > CONSOLIDATING > MASTERED` (RN19).
- **Mastery por tecla** — 3 sessões aprovadas consecutivas (precisão ≥95%, ≥30 tentativas, latência média ≤500ms); regressão após 3 não aprovadas (RN09/RN10).
- **Progressão pedagógica** — lições em fases, reforço com corpus de frases (500 composições originais, normalizadas para ASCII — ADR-016) e pacing ergonômico (15 min de prática → pausa mínima de 3 min, RN33).
- **Dashboard** — heatmap por tecla, tendência por período (WPM/precisão/latência), MasteryProximityIndex [0,1] e agregação por dia no fuso local do usuário (RN34–RN37).
- **Layouts** — ABNT2 e US-INTERNATIONAL, com desempenho isolado por layout (`KeyPerformance` chaveado por `(userId, logicalKey, layout)`).

## API (visão geral)

| Recurso                | Endpoints principais                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `/auth`                | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`                                       |
| `/users` (auth)        | `GET /users/me`, `PATCH /users/me`                                                                    |
| `/lessons` (auth)      | `GET /lessons`, `GET /lessons/:id`, `GET /lessons/performance`                                        |
| `/sessions` (auth)     | `POST /sessions`, pause/resume/submit/abandon por `:sessionId`                                        |
| `/me` (auth)           | progresso, key-performance, progress-card, lição pedagógica/reforço, pratica-status, check ergonômico |
| `/me/dashboard` (auth) | habits, mastery, proximity                                                                            |

Autenticação: enviar `Authorization: Bearer <access_token>`. Posse e autorização são verificadas nos casos de uso (RN16/RN17). A especificação completa das rotas está em `PRD.md`/`SRD.md`.

## Testes

- Testes ao lado do código (`*.test.ts`), com nomes rastreáveis às regras do PRD: ex. `RN14 - submit de sessão já completada não reprocessa`.
- **Só o domínio pesa no limiar de cobertura (≥90%)** — `vitest.config.ts`.
- Estado atual: ~664 testes no backend e ~43 na web.

```bash
npm run test                 # backend
npm run test:coverage        # backend com cobertura
npm --prefix web run test    # web
```

## Benchmarks (NFRs)

| Requisito | Alvo                                                  | Comando                   |
| --------- | ----------------------------------------------------- | ------------------------- |
| RNF06     | submit: `p95 ≤ 150ms` em 1500 eventos                 | `npm run bench`           |
| RNF11     | dashboard: `p95 ≤ 500ms` (1 ano de dados, por semana) | `npm run bench:dashboard` |

Detalhes do ambiente de referência em `BENCH_ENV.md`.

## Contribuindo

Fluxo de desenvolvimento (spec-first + TDD):

1. **Especificar primeiro** — se o comportamento não estiver coberto, atualize `PRD.md` antes do código.
2. **Teste que falha** — nomeado `RNxx - descrição` para regras de domínio (`tester` faz a fase vermelha).
3. **Implementação mínima** — para fazer o teste passar.
4. **Refatorar** — com os testes verdes.
5. **Gate completo** — `npm run lint && npm run typecheck && npm run test` (e web: `npm --prefix web run lint && npm --prefix web run typecheck && npm --prefix web run test`).

Sem código em `domain/`/`application` sem rastreabilidade no PRD.

- **Commits** — Conventional Commits (subject ≤ 72, corpo ≤ 100), tipos `feat`/`fix`/`refactor`/`test`/`docs`/`chore`/`perf`/`build`/`ci`/`revert`/`style`; validado por commitlint + husky.
- **Idioma (ADR-011)** — mensagens/logs/conteúdo de lição em pt-BR; `code` de erro, identificadores e rotas em inglês.
- **Arquitetura** — respeite a regra de dependência; ADRs são imutáveis e, quando mudam, são **superadas** por uma nova ADR (nunca reescritas).

## Documentação de referência

| Arquivo           | Conteúdo                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `PRD.md`          | Requisitos de produto (RN01–RN40), NFRs, catálogo de erros (§28.5) — fonte única                       |
| `SRD.md`          | Container de requisitos: modelos de sistema (Mermaid), especificação de interface, assunções (ADR-015) |
| `ADR.md`          | Decisões técnicas (stack, auth, banco, parâmetros de segurança) — ADR-001 a ADR-022                    |
| `BACKLOG.md`      | Itens executáveis com rastreabilidade a PRD/ADR                                                        |
| `CONSTITUTION.md` | Princípios de engenharia (TDD, SDD, fronteiras, segurança)                                             |
| `AGENTS.md`       | Notas operacionais para agentes de IA e contribuintes                                                  |
| `DESIGN.md`       | Identidade visual / design system da web                                                               |
| `UI-UX-SRD.md`    | Requisitos de interface da web                                                                         |
| `BENCH_ENV.md`    | Ambiente de referência dos benchmarks                                                                  |
| `README-PLAN.md`  | Planejamento da documentação do projeto                                                                |

## Estrutura do repositório

```
./
├── src/                 # Backend (domain, application, infrastructure, presentation, shared)
├── web/                 # UI web (Next.js App Router) — frontend único (ADR-022)
├── bench/               # Cenários autocannon (submit, dashboard)
├── PRD.md / SRD.md / ADR.md / BACKLOG.md / CONSTITUTION.md / AGENTS.md
├── DESIGN.md / UI-UX-SRD.md / BENCH_ENV.md / README-PLAN.md
├── frases-motivacionais.md   # corpus-fonte das 500 frases de reforço (fonte de verdade legível)
└── Curso-Digitacao.md        # conteúdo pedagógico do curso de digitação
```

## Licença

ISC — ver arquivo [`LICENSE`](./LICENSE).

## Autor

**Dalmo Pereira** — [github.com/Dalmossa](https://github.com/Dalmossa)

# Graph Report - Open-type-tutor-py (2026-09-25)

## Corpus Check

- 374 files · ~188,777 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 2692 nodes · 6915 edges · 124 communities (100 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 190 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `036bd3ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- What You Must Do When Invoked
- useCasePorts.ts
- typing-interface.tsx
- benchHarness.ts
- What You Must Do When Invoked
- KeyMasteryTransition
- Lesson
- pedagogicalNestController.ts
- Curso-Digitacao.md
- pedagogicalCurriculum.ts
- dashboard/page.tsx
- PedagogicalProgressionEngine
- lessonNestController.ts
- theme-provider.tsx
- ITypingSessionRepository
- OpenType Tutor
- react
- web/package.json
- lib/session.ts
- ILessonRepository
- testing.ts
- DailyMetricsAggregate
- Layout
- models/auth.ts
- GetLessonPerformance.ts
- DomainError.ts
- SessionNestController
- package.json
- UserProfile
- userController.ts
- PedagogicalPhase
- reconcile-frontier.ts
- Login.ts
- ProgressCardDTOs.ts
- UI/UX Specification (UI-UX-SRD) — OpenType Tutor v1.0
- graphify reference: extra exports and benchmark
- .create
- express
- TypingSession
- compilerOptions
- DESIGN.md
- TypeOrmTypingSessionRepository.ts
- graphify reference: extra exports and benchmark
- AppError
- RegisterUser.ts
- heatmap-keyboard.tsx
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- SessionId
- devDependencies
- ProgressCard
- ResizeObserverStub
- parseSchema
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- next
- compilerOptions
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- RefreshToken.test.ts
- devDependencies
- User
- progress/page.tsx
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- .claude/skills/graphify/references/extraction-spec.md
- .codex/skills/graphify/references/extraction-spec.md
- pedagogical-controller.ts
- Ambiente de Referência para Benchmarks (RNF06 / RNF11)
- authNestController.ts
- next-env.d.ts
- postcss.config.mjs
- virtual-keyboard.ts
- scripts
- Software Requirements Document (SRD) — OpenType Tutor Backend REST API
- data-source.ts
- app.ts
- rateLimitMiddleware.ts
- InMemoryNGramRepository
- dependencies
- api-client.ts
- scripts
- Product Requirements Document (PRD)
- Architecture Decision Records (ADR)
- cena-a.bench.ts
- AGENTS.md — OpenType Tutor Backend
- Backlog — OpenType Tutor Backend REST API
- Constitution — OpenType Tutor Backend REST API
- SubmitTypingSession.ts
- logger.ts
- Frases Motivacionais — Corpus de Inspiração Filosófica
- landing-page.tsx
- README-PLAN.md
- 33. Deployment & Operations
- KeyPerformance
- 16. KeyPerformance
- 28. Requisitos Não Funcionais
- dependencies
- OpenType Tutor — UI web (Fase 8)
- lint-staged
- 13. Autenticação e Autorização
- 24. AdaptiveLessonEngine
- 11. KeystrokeEvent
- 14. MetricsEngine
- 18. Regra de Mastery
- 2. Objetivos do Produto
- 2.3 Requisitos de Usuário
- 9. TypingSession
- 27. Regras de Negócio Consolidadas
- 3. Princípios Arquiteturais
- 6. User
- 7. UserProfile
- RN09-Mastery.md
- pre-commit
- eslint-plugin-boundaries

## God Nodes (most connected - your core abstractions)

1. `SessionId` - 221 edges
2. `Layout` - 112 edges
3. `KeyPerformance` - 65 edges
4. `Lesson` - 61 edges
5. `TypingSession` - 54 edges
6. `buildApp()` - 48 edges
7. `typeorm` - 48 edges
8. `ApiClient` - 46 edges
9. `bootstrap()` - 45 edges
10. `main()` - 43 edges

## Surprising Connections (you probably didn't know these)

- `buildApp()` --calls--> `SubmitTypingSession` [EXTRACTED]
  bench/benchHarness.ts → src/application/use-cases/SubmitTypingSession.ts
- `buildApp()` --calls--> `BcryptPasswordHasher` [EXTRACTED]
  bench/benchHarness.ts → src/infrastructure/auth/BcryptPasswordHasher.ts
- `buildApp()` --calls--> `JwtTokenService` [EXTRACTED]
  bench/benchHarness.ts → src/infrastructure/auth/JwtTokenService.ts
- `buildApp()` --calls--> `InMemoryRateLimiter` [EXTRACTED]
  bench/benchHarness.ts → src/infrastructure/rateLimit/InMemoryRateLimiter.ts
- `buildApp()` --calls--> `InMemoryNGramRepository` [EXTRACTED]
  bench/benchHarness.ts → src/infrastructure/repositories/InMemoryNGramRepository.ts

## Import Cycles

- None detected.

## Communities (124 total, 21 thin omitted)

### Community 0 - "What You Must Do When Invoked"

Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 1 - "useCasePorts.ts"

Cohesion: 0.05
Nodes (43): Catch, Module, supertest, GetDashboardHabitsResponseDTO, GetDashboardMasteryResponseDTO, GetDashboardProximityResponseDTO, LessonPerformanceDTO, ADR-0018 (+35 more)

### Community 2 - "typing-interface.tsx"

Cohesion: 0.09
Nodes (32): ErgonomicCheckModalProps, STATUS_BADGE_CLASS, STATUS_BADGE_LABEL, InfoTip(), InfoTipProps, CompletedPanelProps, CompletionVerdict, STATUS_LABELS (+24 more)

### Community 3 - "benchHarness.ts"

Cohesion: 0.11
Nodes (46): AutocannonReport, BENCH_LESSON_ID, buildApp(), LETTERS, GetLessonResponseDTO, AbandonTypingSession, CheckErgonomicSafety, GetDashboardHabits (+38 more)

### Community 4 - "What You Must Do When Invoked"

Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 5 - "KeyMasteryTransition"

Cohesion: 0.12
Nodes (9): KeyMasteryTransition, KeyMasteryTransitionDTO, KeyMasteryTransitionProps, MASTERY_STATES, ABNT2, USER_ID, ADR-0020, MasteryState (+1 more)

### Community 6 - "Lesson"

Cohesion: 0.15
Nodes (3): Lesson, InMemoryLessonRepository, fromRow()

### Community 7 - "pedagogicalNestController.ts"

Cohesion: 0.12
Nodes (19): CheckErgonomicSafetyResponseDTO, SubmitProgressCardResponseDTO, PedagogicalController, PedagogicalNestController, Body, Controller, Get, HttpCode (+11 more)

### Community 8 - "Curso-Digitacao.md"

Cohesion: 0.01
Nodes (180): 147 258 369 147 258 369, Apresentação, Dicas de ergonomia, Exercícios de memori\zação e velocidade, Lição 30, Memori\zação fase 2, Memorização fase 1, O Aboio (+172 more)

### Community 9 - "pedagogicalCurriculum.ts"

Cohesion: 0.10
Nodes (25): LessonDifficulty, LessonType, SeedPedagogicalCurriculum1700000000005, accentuation, ACCENTUATION_UNITS, drill(), ERGONOMICS_CONTENT, ergonomicsLesson (+17 more)

### Community 10 - "dashboard/page.tsx"

Cohesion: 0.06
Nodes (63): recharts, computeStreaks(), DashboardPage(), EMPTY_COUNTS, EMPTY_KPIS, sliceComparisonWindow(), sliceWindow(), habits (+55 more)

### Community 12 - "lessonNestController.ts"

Cohesion: 0.12
Nodes (18): ListLessonsDTO, ListLessonsResponseDTO, LessonDTO, LayoutValue, LessonController, LessonNestController, Controller, Get (+10 more)

### Community 13 - "theme-provider.tsx"

Cohesion: 0.20
Nodes (9): metadata, applyDocumentTheme(), readPreferredTheme(), Theme, THEME_STORAGE_KEY, ThemeContext, ThemeContextValue, ThemeProvider() (+1 more)

### Community 14 - "ITypingSessionRepository"

Cohesion: 0.17
Nodes (9): SessionCommandDTO, SessionCommandResponseDTO, StartTypingSessionDTO, SubmitTypingSessionDTO, applySessionTransition(), assertSessionOwner(), SessionTransition, SessionNotFoundError (+1 more)

### Community 15 - "OpenType Tutor"

Cohesion: 0.11
Nodes (18): API (visão geral), Arquitetura, Autor, Backend (todas opcionais em dev), Benchmarks (NFRs), Contribuindo, Documentação de referência, Estrutura do repositório (+10 more)

### Community 16 - "react"

Cohesion: 0.08
Nodes (36): react, AuthActionResult, loginAction(), logoutAction(), refreshAction(), RefreshResult, registerAction(), toError() (+28 more)

### Community 17 - "web/package.json"

Cohesion: 0.08
Nodes (22): eslint-plugin-react-hooks, jsdom, @next/eslint-plugin-next, react-dom, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom, @types/react (+14 more)

### Community 18 - "lib/session.ts"

Cohesion: 0.23
Nodes (10): ADR-0010, ADR-0013, dynamic, HomePage(), ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE_SECONDS, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE_SECONDS (+2 more)

### Community 19 - "ILessonRepository"

Cohesion: 0.16
Nodes (3): StartFirstSession, ILessonRepository, IProgressCardRepository

### Community 21 - "testing.ts"

Cohesion: 0.20
Nodes (8): SCHEMA_MIGRATIONS, TABLES, createTestDataSource(), ABNT2, USER_ID, USER_ID, USER_ID, USER_ID

### Community 22 - "DailyMetricsAggregate"

Cohesion: 0.09
Nodes (9): ABNT2, aggregate(), buildUseCase(), NOW, USER_ID, DailyMetricsAggregate, IDailyMetricsAggregateRepository, InMemoryDailyMetricsAggregateRepository (+1 more)

### Community 23 - "Layout"

Cohesion: 0.10
Nodes (20): ADR-0022, ABNT2, NOW, USER_ID, USER_ID, validEvents, validEvents, composeCorrectPayload (+12 more)

### Community 24 - "models/auth.ts"

Cohesion: 0.28
Nodes (7): AuthController, LoginDTO, LoginResponseDTO, RefreshTokenDTO, RefreshTokenResponseDTO, RegisterUserDTO, RegisterUserResponseDTO

### Community 25 - "GetLessonPerformance.ts"

Cohesion: 0.36
Nodes (4): byCompletedAt(), LessonAggregate, computeLessonPerformanceStatus(), LessonPerformanceInput

### Community 26 - "DomainError.ts"

Cohesion: 0.16
Nodes (10): BreakRequiredError, DiscomfortSignaledError, DomainError, InvalidCredentialsError, InvalidSessionTransitionError, LessonNotFoundError, ProfileNotOwnedError, SessionAlreadyCompletedError (+2 more)

### Community 27 - "SessionNestController"

Cohesion: 0.34
Nodes (8): SessionNestController, Body, Controller, HttpCode, Param, Post, Req, UseGuards

### Community 28 - "package.json"

Cohesion: 0.05
Nodes (39): author, description, eslint, @eslint/js, @types/node, typescript, typescript-eslint, vitest (+31 more)

### Community 29 - "UserProfile"

Cohesion: 0.06
Nodes (16): DashboardCountsByState, DashboardHeatmapKey, DashboardKPI, DashboardTrendPoint, ADR-0020, shiftLocalDate(), Clock, ADR-0020 (+8 more)

### Community 30 - "userController.ts"

Cohesion: 0.11
Nodes (15): Patch, GetUserResponseDTO, UpdateUserLayoutDTO, UpdateUserLayoutResponseDTO, UserController, Body, Controller, Get (+7 more)

### Community 31 - "PedagogicalPhase"

Cohesion: 0.18
Nodes (3): ProgressCardInternalProps, ProgressCardProps, PedagogicalPhase

### Community 32 - "reconcile-frontier.ts"

Cohesion: 0.26
Nodes (11): better-sqlite3, APPLY, cardFor(), countBackspaces(), FrontierPosition, LessonInfo, loadLessons(), main() (+3 more)

### Community 33 - "Login.ts"

Cohesion: 0.13
Nodes (8): bcrypt, LoginDTO, LoginResponseDTO, IPasswordHasher, ITokenService, comparePassword(), hashPassword(), BcryptPasswordHasher

### Community 34 - "ProgressCardDTOs.ts"

Cohesion: 0.33
Nodes (6): ErgonomicCheckInput, GetNextPedagogicalLessonInputDTO, GetNextPedagogicalLessonResponseDTO, StartFirstSessionInputDTO, StartFirstSessionResponseDTO, ProgressCardDTO

### Community 35 - "UI/UX Specification (UI-UX-SRD) — OpenType Tutor v1.0"

Cohesion: 0.05
Nodes (43): 10. Responsividade, 11. Acessibilidade (WCAG 2.1 AA orientação), 12. Estados da Interface, 13. Microinterações, 14. Rastreabilidade PRD → UI, 15. Critérios de Aceitação da UI v1.0, 16. Fora de Escopo (v1.0 da UI), 1.1 Nome (+35 more)

### Community 36 - "graphify reference: extra exports and benchmark"

Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 37 - ".create"

Cohesion: 0.13
Nodes (15): createLesson(), createLesson(), lessonId(), createLesson(), createLesson(), createLesson(), createRunningSession(), createLesson() (+7 more)

### Community 38 - "express"

Cohesion: 0.10
Nodes (24): Delete, Injectable, express, @nestjs/common, GetUserKeyPerformanceResponseDTO, PracticeStatusDTO, GetUserProgressResponseDTO, DependencyToken (+16 more)

### Community 39 - "TypingSession"

Cohesion: 0.05
Nodes (28): completedSession(), saveCompleted(), ABNT2, sessionMetrics(), USER_ID, EventType, KeystrokeEvent, SessionMetrics (+20 more)

### Community 40 - "compilerOptions"

Cohesion: 0.07
Nodes (28): compilerOptions, baseUrl, declaration, declarationMap, emitDecoratorMetadata, exactOptionalPropertyTypes, experimentalDecorators, forceConsistentCasingInFileNames (+20 more)

### Community 41 - "DESIGN.md"

Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 42 - "TypeOrmTypingSessionRepository.ts"

Cohesion: 0.11
Nodes (14): UserRow, fromIso(), fromIsoOrNull(), toIso(), toIsoOrNull(), toRow(), fromRow(), toRow() (+6 more)

### Community 43 - "graphify reference: extra exports and benchmark"

Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 44 - "AppError"

Cohesion: 0.08
Nodes (17): zod, appErrorFromCode(), RefreshTokenExpiredError, toAppError(), AuthenticatedRequest, sendUnauthorized(), ErrorBody, createErrorHandler() (+9 more)

### Community 46 - "heatmap-keyboard.tsx"

Cohesion: 0.48
Nodes (5): HeatmapKeyboard(), HeatmapKeyboardProps, mix(), useTheme(), DashboardHeatmapKey

### Community 47 - "graphify reference: query, path, explain"

Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 48 - "graphify reference: query, path, explain"

Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 50 - "SessionId"

Cohesion: 0.06
Nodes (14): DailyMetricsAggregateInternalProps, DailyMetricsAggregateProps, Progress, ProgressDTO, ProgressInternalProps, ProgressProps, LessonCompletionData, ProgressionEngine (+6 more)

### Community 51 - "devDependencies"

Cohesion: 0.07
Nodes (28): devDependencies, autocannon, @commitlint/cli, @commitlint/config-conventional, eslint, eslint-import-resolver-typescript, @eslint/js, eslint-plugin-boundaries (+20 more)

### Community 52 - "ProgressCard"

Cohesion: 0.13
Nodes (7): lessonId(), OK_POSTURE, ProgressCard, NextLessonResult, PedagogicalPhaseValue, VALID_PHASES, InMemoryProgressCardRepository

### Community 54 - "parseSchema"

Cohesion: 0.15
Nodes (14): SubmitTypingSessionResponseDTO, SessionMetricsProps, SessionController, Inject, SessionCommandPort, StartSessionPort, SubmitSessionPort, parseSchema() (+6 more)

### Community 55 - "graphify reference: add a URL and watch a folder"

Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 56 - "graphify reference: commit hook and native CLAUDE.md integration"

Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 58 - "compilerOptions"

Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 59 - "graphify reference: incremental update and cluster-only"

Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 60 - "graphify reference: add a URL and watch a folder"

Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 61 - "graphify reference: commit hook and native CLAUDE.md integration"

Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 62 - "graphify reference: incremental update and cluster-only"

Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 64 - "RefreshToken.test.ts"

Cohesion: 0.10
Nodes (22): jsonwebtoken, IPasswordValidator, AuthParams, InvalidTokenError, signToken(), TokenExpiredError, TokenPayload, verifyToken() (+14 more)

### Community 65 - "devDependencies"

Cohesion: 0.12
Nodes (17): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, jsdom, @next/eslint-plugin-next, tailwindcss, @tailwindcss/postcss (+9 more)

### Community 66 - "User"

Cohesion: 0.11
Nodes (7): User, UserDTO, UserProps, UserNotFoundError, IUserRepository, Email, InMemoryUserRepository

### Community 67 - "progress/page.tsx"

Cohesion: 0.25
Nodes (9): KeyStat(), MASTERY_LABELS, MASTERY_STYLES, SummaryCard(), Metric(), ResultMetric(), getMetricHelp(), MASTERY_HELP (+1 more)

### Community 76 - "pedagogical-controller.ts"

Cohesion: 0.25
Nodes (6): PedagogicalController, ErgonomicCheckDTO, ErgonomicCheckResponseDTO, GetNextPedagogicalLessonResponseDTO, SubmitProgressCardDTO, SubmitProgressCardResponseDTO

### Community 77 - "Ambiente de Referência para Benchmarks (RNF06 / RNF11)"

Cohesion: 0.17
Nodes (11): Ambiente de Referência para Benchmarks (RNF06 / RNF11), Baseline Atual (Registrado em 2026-09-19), Checklist de Validação Antes de Commitar Mudança no BENCH_ENV.md, Como Reproduzir, Configuração do Banco de Dados (SQLite), Dataset de Seed para Benchmark, Hardware, Parâmetros do Benchmark RNF06 (submit) (+3 more)

### Community 82 - "authNestController.ts"

Cohesion: 0.16
Nodes (13): AuthController, AuthNestController, Body, Controller, HttpCode, Inject, Post, LoginPort (+5 more)

### Community 93 - "virtual-keyboard.ts"

Cohesion: 0.06
Nodes (39): CompletedPanel(), formatDecimal(), formatDuration(), formatNumber(), TypingInterface(), clearPressed(), handleBlur(), handleKeyDown() (+31 more)

### Community 94 - "scripts"

Cohesion: 0.11
Nodes (19): scripts, bench, bench:cena-a, bench:dashboard, build, commitlint, dev, dev:api (+11 more)

### Community 96 - "Software Requirements Document (SRD) — OpenType Tutor Backend REST API"

Cohesion: 0.06
Nodes (32): 1.1 Propósito, 1.2 Escopo, 1.3 Leitores e navegação, 1.4 Glossário, 1.5 Referências e convenção linguística, 1. Introdução, 2. Requisitos de Usuário, 3. Arquitetura do Sistema (+24 more)

### Community 97 - "data-source.ts"

Cohesion: 0.03
Nodes (51): typeorm, ALL_MIGRATIONS, DataSourceConfig, SqliteDatabaseHandle, databaseParams, DailyMetricsAggregateEntity, DailyMetricsAggregateRow, KeyMasteryTransitionEntity (+43 more)

### Community 102 - "app.ts"

Cohesion: 0.11
Nodes (22): AppDependencies, createApp(), TestContext, DashboardController, ProgressController, getAuthUserId(), Inject, Inject (+14 more)

### Community 104 - "rateLimitMiddleware.ts"

Cohesion: 0.28
Nodes (6): IRateLimiter, RateLimitDecision, InMemoryRateLimiter, WindowEntry, RateLimitPolicy, ErrorBody

### Community 105 - "InMemoryNGramRepository"

Cohesion: 0.18
Nodes (7): ADR-0007, InMemoryNGramRepository, normalizeAscii(), PT_BR_PHRASES, PT_BR_PHRASES_RAW, STARTER_PHRASES, ADR-0016

### Community 108 - "dependencies"

Cohesion: 0.13
Nodes (15): dependencies, bcrypt, better-sqlite3, express, jsonwebtoken, @nestjs/common, @nestjs/core, @nestjs/platform-express (+7 more)

### Community 110 - "api-client.ts"

Cohesion: 0.06
Nodes (29): AuthContextValue, DashboardController, Controllers, LessonController, ProgressController, SessionController, UserController, ApiErrorPayload (+21 more)

### Community 113 - "scripts"

Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, lint:fix, start, test, test:watch (+1 more)

### Community 118 - "Product Requirements Document (PRD)"

Cohesion: 0.08
Nodes (25): 10. Tempo Ativo da Sessão, 12. SessionMetrics, 15. Gross WPM, Net WPM, Accuracy, Latência, 17. Estados de Domínio, 19. Regressão de MASTERED e semântica dos contadores, 1.1 Idioma do Produto, 1. Visão Geral, 20. Classificação por WeakKeyScore (+17 more)

### Community 124 - "Architecture Decision Records (ADR)"

Cohesion: 0.08
Nodes (24): ADR-001 — Linguagem de implementação: TypeScript em modo strict, ADR-002 — Stack de backend: Node.js + Express + TypeORM + SQLite, ADR-003 — Arquitetura em camadas: Clean Architecture + DDD, ADR-004 — Autenticação: JWT stateless + bcrypt, ADR-005 — Estratégia de troca futura de banco de dados, ADR-006 — Parâmetros do algoritmo adaptativo e de segurança como configuração versionada, ADR-007 — Conteúdo de reforço via porta INGramRepository, ADR-008 — Idempotência do submit de sessão (+16 more)

### Community 129 - "cena-a.bench.ts"

Cohesion: 0.27
Nodes (18): buildKeystrokes(), jsonResponse(), postJson(), printReferenceEnvironment(), printReport(), runAutocannon(), seedCompletedSessions(), seedLesson() (+10 more)

### Community 139 - "AGENTS.md — OpenType Tutor Backend"

Cohesion: 0.12
Nodes (16): AGENTS.md — OpenType Tutor Backend, Architecture (Clean Architecture + DDD), Common Gotchas, Critical Domain Rules (from PRD), Development Flow (SDD + TDD), graphify, Key Conventions, Language Policy (ADR-011) (+8 more)

### Community 146 - "Backlog — OpenType Tutor Backend REST API"

Cohesion: 0.11
Nodes (18): Backlog — OpenType Tutor Backend REST API, Distribuição — Decisão A registrada (ADR-016), Fase 0 — Fundação Técnica, Fase 1.5 — Metodologia Pedagógica (Domain Core), Fase 1 — Domain Core (Entidades e Value Objects), Fase 2 — Domain Services, Fase 3 — Autenticação (Domain + Application), Fase 4 — Application (Use Cases) (+10 more)

### Community 148 - "Constitution — OpenType Tutor Backend REST API"

Cohesion: 0.13
Nodes (14): 10. Convenções de processo, 11. Observabilidade mínima, 12. Integridade documental, 13. Escopo deste documento, 1. Regra de Dependência (Clean Architecture), 2. Princípios SOLID — aplicação concreta, 3. Configuração e parâmetros, 4. TypeScript e qualidade estática (+6 more)

### Community 155 - "SubmitTypingSession.ts"

Cohesion: 0.10
Nodes (15): Clock, GetReinforcementLessonResponseDTO, FALLBACK_HOME_ROW_KEYS, ResetProgress, ADR-0020, ADR-0020, PracticePacingInternalProps, PracticePacingState (+7 more)

### Community 162 - "logger.ts"

Cohesion: 0.40
Nodes (3): pino, logger, options

### Community 167 - "Frases Motivacionais — Corpus de Inspiração Filosófica"

Cohesion: 0.17
Nodes (11): 10. Crescimento e Transformação, 1. Persistência e Disciplina, 2. Aprendizado e Conhecimento, 3. Foco e Atenção, 4. Superação de Obstáculos, 5. Coragem e Ação, 6. Autoconhecimento, 7. Tempo e Paciência (+3 more)

### Community 225 - "landing-page.tsx"

Cohesion: 0.13
Nodes (15): ADR-0011, @testing-library/react, ADAPTIVE, AUDIENCE, buttonPrimary(), buttonSecondary(), FEATURES, LandingPage() (+7 more)

### Community 226 - "README-PLAN.md"

Cohesion: 0.20
Nodes (9): Anexo A — Estado de implementação (24/09), Anexo B — Execução pendente: Perfil (`/app/profile`, UI-UX-SRD §6.7), E eu mudaria a concepção da página inicial, E existe outra oportunidade muito boa, Minha recomendação para o próximo passo, O ponto que eu acrescentaria, O que o PRD já define, `UI-UX-SRD.md` — Especificação de UI/UX do OpenType Tutor (+1 more)

### Community 243 - "33. Deployment & Operations"

Cohesion: 0.29
Nodes (7): 33.1 Variáveis de Ambiente, 33.2 Docker / Containerização, 33.3 CI/CD Pipeline, 33.4 Observabilidade Mínima, 33.5 Backup & Retenção de Dados, 33.6 Rollback de Migração, 33. Deployment & Operations

### Community 262 - "KeyPerformance"

Cohesion: 0.06
Nodes (18): DashboardProximityKey, key(), key(), AdaptiveParams, KeyPerformance, KeyPerformanceInternalProps, KeyPerformanceProps, WEAK_KEY_SCORE_WEIGHTS (+10 more)

### Community 278 - "16. KeyPerformance"

Cohesion: 0.33
Nodes (6): 16.1 ErrorRate, 16.2 KeyAccuracy (nova nesta versão — usada pelo critério de mastery, Seção 18), 16.3 LatencyScore, 16.4 RecencyScore, 16.5 WeakKeyScore, 16. KeyPerformance

### Community 279 - "28. Requisitos Não Funcionais"

Cohesion: 0.33
Nodes (6): 28.1 Requisitos Não Funcionais de Produto, 28.2 Requisitos Não Funcionais Organizacionais, 28.3 Requisitos Não Funcionais Externos, 28.4 Conflitos Conhecidos entre Requisitos Não Funcionais, 28.5 Catálogo de Erros, 28. Requisitos Não Funcionais

### Community 280 - "dependencies"

Cohesion: 0.40
Nodes (5): dependencies, next, react, react-dom, recharts

### Community 282 - "OpenType Tutor — UI web (Fase 8)"

Cohesion: 0.33
Nodes (5): Checagens, Como rodar, Estrutura (protocolo MVC — ADR-018), OpenType Tutor — UI web (Fase 8), RNF06 (TASK-080) e paridade (TASK-081)

### Community 283 - "lint-staged"

Cohesion: 0.67
Nodes (3): lint-staged, *.{json,md,yml,yaml}, *.{ts,tsx}

### Community 299 - "13. Autenticação e Autorização"

Cohesion: 0.40
Nodes (5): 13.1 Estratégia (ADR-004), 13.2 Endpoints, 13.3 Regras, 13.4 Fora de escopo desta versão, 13. Autenticação e Autorização

### Community 300 - "24. AdaptiveLessonEngine"

Cohesion: 0.40
Nodes (5): 24.1 Pools de Reforço, 24.2 Redistribuição, 24.3 Tamanho da lição adaptativa, 24.4 Fallback sem pool selecionável, 24. AdaptiveLessonEngine

### Community 310 - "11. KeystrokeEvent"

Cohesion: 0.50
Nodes (4): 11.1 EventType, 11.2 physicalKey vs. logicalKey vs. expectedCharacter, 11.3 Dead Keys, 11. KeystrokeEvent

### Community 330 - "14. MetricsEngine"

Cohesion: 0.67
Nodes (3): 14.1 Cálculo de Caracteres, 14.2 Backspace e Correções, 14. MetricsEngine

### Community 331 - "18. Regra de Mastery"

Cohesion: 0.67
Nodes (3): 18.1 Mastery-Approved Session, 18.2 Transição para MASTERED, 18. Regra de Mastery

### Community 332 - "2. Objetivos do Produto"

Cohesion: 0.67
Nodes (3): 2.1 Objetivo principal, 2.2 Objetivos específicos, 2. Objetivos do Produto

### Community 333 - "2.3 Requisitos de Usuário"

Cohesion: 0.67
Nodes (3): 2.3.1 Obrigatórios (deve), 2.3.2 Desejáveis (pode) — fora do escopo desta versão, 2.3 Requisitos de Usuário

### Community 334 - "9. TypingSession"

Cohesion: 0.67
Nodes (3): 9.1 Estados, 9.2 Transições válidas, 9. TypingSession

## Knowledge Gaps

- **933 isolated node(s):** `BENCH_LESSON_ID`, `LETTERS`, `AutocannonReport`, `InteractiveReport`, `ADR-0016` (+928 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1182 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionId` connect `SessionId` to `benchHarness.ts`, `KeyMasteryTransition`, `KeyPerformance`, `Lesson`, `pedagogicalCurriculum.ts`, `PedagogicalProgressionEngine`, `ITypingSessionRepository`, `ILessonRepository`, `testing.ts`, `DailyMetricsAggregate`, `Layout`, `GetLessonPerformance.ts`, `SubmitTypingSession.ts`, `UserProfile`, `PedagogicalPhase`, `reconcile-frontier.ts`, `ProgressCardDTOs.ts`, `.create`, `TypingSession`, `TypeOrmTypingSessionRepository.ts`, `ProgressCard`, `User`, `data-source.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `typeorm` connect `data-source.ts` to `User`, `benchHarness.ts`, `TypingSession`, `pedagogicalCurriculum.ts`, `TypeOrmTypingSessionRepository.ts`, `SessionId`, `testing.ts`, `Layout`, `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `BENCH_LESSON_ID`, `LETTERS`, `AutocannonReport` to the rest of the system?**
  _933 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `useCasePorts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050595238095238096 - nodes in this community are weakly interconnected._
- **Should `typing-interface.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08985507246376812 - nodes in this community are weakly interconnected._

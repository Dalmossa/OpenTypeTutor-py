# AGENTS.md — OpenType Tutor Backend

## Quick Reference

| Command                          | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `npm run dev`                    | Start dev server with hot reload (tsx watch)             |
| `npm run build`                  | Compile TypeScript to `dist/`                            |
| `npm start`                      | Run production build from `dist/`                        |
| `npm run lint`                   | Lint source (strict, boundary checks)                    |
| `npm run lint:fix`               | Auto-fix lint issues                                     |
| `npm run typecheck`              | Type-check without emit                                  |
| `npm run test`                   | Run vitest once (90% coverage threshold on domain)       |
| `npm run test:watch`             | Watch mode                                               |
| `npm run test:coverage`          | Coverage report (v8 provider)                            |
| `npm run bench`                  | Run autocannon benchmark (RNF06)                         |
| `npm --prefix web run dev`       | Start Next.js web (porta 3000, rewrite `/api` → backend) |
| `npm --prefix web run lint`      | Lint web (eslint flat config + `--max-warnings 0`)       |
| `npm --prefix web run typecheck` | Type-check web (`tsc --noEmit`)                          |
| `npm --prefix web run test`      | Run web vitest                                           |
| `npm --prefix web run build`     | Production build Next.js                                 |

**Order matters:** `lint → typecheck → test` (CI pipeline order)

---

## Architecture (Clean Architecture + DDD)

```
src/
├── domain/           # Pure business logic — NO external deps
│   ├── config/       # adaptiveParams.ts (weights, thresholds)
│   ├── entities/     # User, TypingSession, KeyPerformance, Progress, Lesson
│   ├── value-objects/# Email, Layout, SessionId
│   ├── services/     # MetricsEngine, AdaptiveLessonEngine, ProgressionEngine
│   ├── repositories/ # Interfaces only (IUserRepository, etc.)
│   └── errors/       # DomainError subclasses
├── application/      # Use cases + DTOs (orchestrates domain + repo interfaces)
├── infrastructure/   # Implementations (TypeORM, SQLite, bcrypt, JWT, logger)
│   ├── auth/         # bcrypt hashing, JWT sign/verify, authParams.ts
│   └── logger/       # pino setup
├── presentation/     # Express, controllers, routes, middlewares, validators
└── shared/           # AppError, ERROR_CODES
```

**Dependency rule (enforced by lint):**

- `presentation → application → domain ← infrastructure`
- Domain NEVER imports: `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, `pino`
- Infrastructure implements domain repository interfaces

### Presentation clients follow MVC (ADR-018)

- A UI (web Next.js; o antigo cliente desktop customtkinter foi removido — ADR-022) segue o **protocolo MVC**: `views/` → `controllers/` → `services/` → REST.
- **Nenhuma RN no cliente** — RN14 (idempotência), RN22 (insufficient-data), RN16/17 (auth/posse) permanecem no backend; a apresentação só consome o REST.
- Models de UI são DTOs, nunca entidades de domínio.

---

## Key Conventions

### TypeScript

- `strict: true`, `noImplicitAny: true`, exactOptionalPropertyTypes, noUncheckedIndexedAccess
- Path alias: `@/*` → `src/*` (tsconfig + vitest)
- `any` is an error (eslint `@typescript-eslint/no-explicit-any: error`)

### Testing (vitest)

- Tests live beside code: `*.test.ts` in `src/`
- Only domain tests counted for 90% coverage threshold (`vitest.config.ts` line 12)
- Test names trace to PRD rules: `RN14 - submit de sessão já completada não reprocessa`
- Run single test: `npx vitest run -t "RN14"`

### Lint Boundaries (eslint-plugin-boundaries)

| Layer              | Can import                                                                  | Cannot import                                                                                                        |
| ------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `domain/*`         | `domain/*`, `shared/*`                                                      | `infrastructure/*`, `presentation/*`, `application/*`, `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, `pino` |
| `application/*`    | `application/*`, `domain/*`, `shared/*`                                     | `infrastructure/*`, `presentation/*`, `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `pino`                         |
| `infrastructure/*` | `infrastructure/*`, `domain/*`, `application/*`, `shared/*`                 | `presentation/*`, `express`                                                                                          |
| `presentation/*`   | `presentation/*`, `application/*`, `domain/*`, `shared/*`, `express`, `zod` | `infrastructure/*`, `typeorm`, `bcrypt`, `jsonwebtoken`, `pino`                                                      |

Violations = build failure.

---

## Critical Domain Rules (from PRD)

- **RN12**: `CORRECTION` fixes existing error, never creates new error
- **RN14**: Submit idempotent — `COMPLETED` session returns cached result
- **RN16/RN17**: Auth = middleware extracts `userId` from JWT; ownership checked in use case (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`)
- **RN19**: Pool rounding tiebreak: `WEAK > CONSOLIDATING > MASTERED`
- **RN21**: `FinalUncorrectedErrors = max(0, TotalErrors − CorrectedErrors)`
- **RN22**: Sessions `< 3000ms` OR `< 5 chars` → `insufficient-data` (no WPM)

### Mastery (RN09)

```
KeyAccuracy ≥ 95% AND attempts ≥ 30 AND avgLatency ≤ 500ms
→ 3 consecutive mastery-approved sessions → MASTERED
```

- `KeyAccuracy = 1 − ErrorRate` (RN20)
- Regression: 3 consecutive non-approved sessions (RN10)
- Two counters: `consecutiveMasterySessions` (pre-MASTERED), `regressionSessions` (post-MASTERED) — never increment together

---

## Language Policy (ADR-011)

| Fica em pt-BR                                            | Fica em inglês                                            |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `message` de erro, logs para humanos, conteúdo de lições | `code` de erro, identificadores de código, rotas, commits |

- Error catalog (code → pt-BR message) lives in `PRD.md` §28.5 — centralize as `shared/errors/ERROR_CODES.ts` (TASK-071), don't inline strings in controllers.
- Zod's default validation messages are English — **must** configure a custom error map (TASK-070), or `VALIDATION_ERROR` responses silently violate this policy.
- Phases 0–2 predate this ADR — audit existing `DomainError`/`AppError`/logger messages (TASK-069) before shipping Presentation layer.

---

## Security Parameters (validated in ADR-010)

| Param                        | Value               | Location                            |
| ---------------------------- | ------------------- | ----------------------------------- |
| `BCRYPT_SALT_ROUNDS`         | 12                  | `infrastructure/auth/authParams.ts` |
| `JWT_ACCESS_EXPIRATION`      | `15m` (short-lived) | `infrastructure/auth/authParams.ts` |
| `JWT_REFRESH_EXPIRATION`     | `30d` (long-lived)  | `infrastructure/auth/authParams.ts` |
| `MIN_PASSWORD_LENGTH`        | 8 (no complexity)   | `infrastructure/auth/authParams.ts` |
| `ACTIVE_DURATION_EPSILON_MS` | 1000                | `domain/config/adaptiveParams.ts`   |

**Never hardcode** — all centralized, never inline in logic.

---

## Common Gotchas

1. **No `passwordHash` in DTOs** — explicit exclusion in entity→DTO mapping (CONSTITUTION §4)
2. **Domain errors vs AppError** — DomainError for business rules; AppError for HTTP mapping (presentation)
3. **JWT payload** — only `userId` as claim; never email, passwordHash, or full token in logs
4. **SQLite concurrency** — known write-lock risk under concurrent submit (TASK-054); use optimistic lock/transaction in repos
5. **Refresh tokens** — implemented in Phase 3 (ADR-004, ADR-010): `POST /auth/refresh` use case (`RefreshToken`) rotates the refresh token (revokes old, emits new); access token = `15m`, refresh token = `30d`
6. **Dead keys** — US-INTERNATIONAL compose: latency measured from first compose event to final keydown; single error per composed char
7. **Layout isolation** — `KeyPerformance` keyed by `(userId, logicalKey, layout)` — ABNT2 ≠ US-INTERNATIONAL

---

## Reference Documents

| File                | Purpose                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRD.md`            | Product requirements, domain rules (RN01–RN23), NFRs — single source of truth                                                                            |
| `SRD.md`            | SRD _container_ (Sommerville §6.2–6.4): system models (Mermaid), interface spec, assumptions. References PRD — never duplicates RN/RNF/catalog (ADR-015) |
| `CONSTITUTION.md`   | Engineering principles (TDD, SDD, boundaries, security)                                                                                                  |
| `ADR.md`            | Technical decisions (stack, auth, DB strategy, params)                                                                                                   |
| `BACKLOG.md`        | Executable tasks with traceability to PRD/ADR                                                                                                            |
| `eslint.config.mjs` | Boundary enforcement rules                                                                                                                               |
| `vitest.config.ts`  | Test config (90% domain coverage, all tests run — no name filtering)                                                                                     |

---

## Development Flow (SDD + TDD)

1. **Spec first** — Update PRD if behavior not covered
2. **Write failing test** — Named `RNxx - description` for domain rules
3. **Implement minimum** — Make test pass
4. **Refactor** — With tests green
5. **Run full check** — `npm run lint && npm run typecheck && npm run test`

No code in `domain/`/`application` without PRD traceability.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

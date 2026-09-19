# Backlog — OpenType Tutor Backend REST API

Traduz `PRD.md` em itens executáveis, seguindo Spec-Driven Development (`CONSTITUTION.md` Seção 5): todo item referencia um RF/RN/ADR — nenhum item existe sem especificação correspondente. A ordem das fases segue `PRD.md` Seção 30.

**Convenções:** `US-XXX` (entrega de valor observável) / `TASK-XXX` (suporte técnico, sem valor observável isolado). **DoD:** ver `CONSTITUTION.md` Seção 10. Status: `A fazer` / `Em andamento` / `Concluído` / `Bloqueado`.

---

## Fase 0 — Fundação Técnica

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-001 | Inicializar projeto Node.js + TypeScript modo `strict`, estrutura de pastas em camadas (`domain/`, `application/`, `infrastructure/`, `presentation/`, `shared/`) | ADR-001, ADR-002, ADR-003 | Concluído |
| TASK-002 | Configurar lint de boundaries entre camadas (bloqueia build em violação) | CONSTITUTION §1 | Concluído |
| TASK-003 | Configurar test runner e convenção de nomenclatura de teste rastreável a RN (ex. `RN14 - ...`) | CONSTITUTION §7 | Concluído |
| TASK-004 | Criar `domain/config/adaptiveParams.ts` com os parâmetros de produto centralizados (PRD §26) | ADR-006, PRD §26 | Concluído |
| TASK-005 | Criar `infrastructure/auth/authParams.ts` com os parâmetros de segurança centralizados — valores validados em ADR-010 (`BCRYPT_SALT_ROUNDS=12`, `JWT_EXPIRATION=24h`, `MIN_PASSWORD_LENGTH=8`) | ADR-004, ADR-006, ADR-010, PRD §26 | Concluído |

---

## Fase 1 — Domain Core (Entidades e Value Objects)

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-006 | Modelar Value Objects: `Layout`, `Email`, `SessionId` | PRD §6–§9 | Concluído |
| TASK-007 | Modelar entidade `User` (com `passwordHash`, nunca exposto fora do domínio) | PRD §6, RNF08 | Concluído |
| TASK-008 | Modelar entidade `UserProfile` | PRD §7 | Concluído |
| TASK-009 | Modelar entidade `Lesson` (`type`, `difficulty`, `targetKeys`) | PRD §8 | Concluído |
| TASK-010 | Modelar entidade `TypingSession` e `KeystrokeEvent`, com estados e transições (§9) | PRD §9, §11 | Concluído |
| TASK-011 | Modelar `SessionMetrics` | PRD §12 | Concluído |
| TASK-012 | Modelar entidade `KeyPerformance` (chave `userId+logicalKey+layout`) | PRD §16, RN11 | Concluído |
| TASK-013 | Modelar entidade `Progress` | PRD §22 | Concluído |
| TASK-014 | Definir interfaces em `domain/repositories/`: `IUserRepository`, `ILessonRepository`, `ITypingSessionRepository`, `IKeyPerformanceRepository`, `IProgressRepository`, `INGramRepository` | ADR-005, ADR-007 | Concluído |
| TASK-015 | Implementar repositórios em memória (fakes) para uso em testes de domínio | ADR-005, RNF07 | Concluído |
| TASK-015a | (TDD) Modelar Value Object `PedagogicalPhase` (7 fases: ERGONOMICS_SETUP, HOME_ROW, UPPER_LOWER_ROWS, WORD_FIXATION, ACCENTUATION, LONG_TEXTS, NUMERIC_KEYPAD) | PRD §25, RN25 | Concluído |
| TASK-015b | (TDD) Modelar entidade `ProgressCard` (Cartão de Progresso: data, fase, lição, teclas inseguras, desconforto, observação, backspace counts) | PRD §27, RN27 | Concluído |
| TASK-015c | (TDD) Estender entidade `Lesson` com `pedagogicalPhase` e `lessonInPhase` | PRD §8, RN25 | Concluído |

---

## Fase 1.5 — Metodologia Pedagógica (Domain Core)

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-033a | (TDD) Implementar `PedagogicalProgressionEngine` (domain service): getNextLesson, getFirstLessonOfPhase, getLessonsForPhase, hasLessonsForPhase, getLessonByPhaseAndNumber | PRD §25, RN25, RN26, RN29 | Concluído |
| TASK-033b | (TDD) Critério de avanço em `ProgressCard.canAdvance`: backspaces ≤ anterior, sem desconforto, não olha teclado | PRD §26, RN26 | Concluído |
| TASK-033c | (TDD) Variação de exercício em `ProgressCard.shouldVaryExercise`: se qualquer critério falhar (exceto desconforto), variar antes de repetir | PRD §29, RN29 | Concluído |
| TASK-033d | (TDD) Regra de segurança em `PedagogicalProgressionEngine`: desconforto → pause_discomfort (prioridade máxima) | PRD §28, RN28 | Concluído |
| TASK-033e | (TDD) Cartão de Progresso string format para continuidade entre sessões | PRD §27, RN27, RN30 | Concluído |
| TASK-033f | Seed migration: popular currículo completo do Curso-Digitacao.md (80 lições em 7 fases) | PRD §25, RN24, RN25 | Concluído |

---

## Fase 2 — Domain Services

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-016 | (TDD) Testes da máquina de estados da sessão: transições válidas/inválidas (§9.2) | PRD §9.2, CONSTITUTION §6 | Concluído |
| TASK-017 | Implementar transições de `TypingSession` conforme TASK-016 | PRD §9 | Concluído |
| TASK-018 | (TDD) Testes de `ActiveDuration`/`ActiveDurationMinutes`, incluindo proteção `ε` contra divisão por zero | PRD §10, CONSTITUTION §6 | Concluído |
| TASK-019 | (TDD) Testes de cálculo de caracteres (exclusão de eventos de controle) | PRD §14.1 | Concluído |
| TASK-020 | (TDD) Testes de `INCORRECT`/`CORRECTION` e `FinalUncorrectedErrors = max(0, errors − correctedErrors)`, incluindo caso `correctedErrors > errors` | PRD §12, §14.2, RN21 | Concluído |
| TASK-021 | Implementar `MetricsEngine`: Gross WPM, Net WPM, Accuracy, Latência | PRD §15, TASK-018/019/020 | Concluído |
| TASK-022 | (TDD) Testes de dead keys: composição não gera erro artificial; latência medida do primeiro evento da sequência ao evento final | PRD §11.3 | Concluído |
| TASK-023 | (TDD) Testes de `ErrorRate`, `KeyAccuracy`, `LatencyScore`, `RecencyScore`, `WeakKeyScore` | PRD §16.1–§16.5, RN04–RN07, RN20 | Concluído |
| TASK-024 | Implementar cálculos de `KeyPerformance` conforme TASK-023 | PRD §16 | Concluído |
| TASK-025 | (TDD) Testes de `UNKNOWN` (`attempts < 5`) | PRD §21, RN08 | Concluído |
| TASK-026 | (TDD) Testes de mastery-approved session, transição para `MASTERED`, e semântica dos contadores `consecutiveMasterySessions`/`regressionSessions` (tabela §19) | PRD §18–§19, RN09 | Concluído |
| TASK-027 | Implementar avaliação de `masteryState` conforme TASK-025/026 | PRD §17–§20 | Concluído |
| TASK-028 | (TDD) Testes de regressão de `MASTERED` (3 sessões não aprovadas consecutivas) | PRD §19, RN10 | Concluído |
| TASK-029 | (TDD) Testes de isolamento de `KeyPerformance` por layout (`userId+logicalKey+layout`) | PRD §16, RN11 | Concluído |
| TASK-030 | (TDD) Testes de pools de reforço (60/25/15), redistribuição de pool vazio, e desempate determinístico do arredondamento (RN19) | PRD §24.1, §25, RN19 | Concluído |
| TASK-031 | Implementar `AdaptiveLessonEngine` conforme TASK-030, consumindo `INGramRepository` | PRD §24, ADR-007 | Concluído |
| TASK-032 | (TDD) Testes de `ProgressionEngine`: conclusão de lição, avanço de nível, seleção da próxima lição, diferença entre progressão normal e reforço | PRD §23 | Concluído |
| TASK-033 | Implementar `ProgressionEngine` conforme TASK-032 | PRD §23 | Concluído |

---

## Fase 3 — Autenticação (Domain + Application)

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-034 | (TDD) Testes de validação de política mínima de senha antes do hashing | PRD §13.3, RN18 | Concluído |
| TASK-035 | (TDD) Testes de que `passwordHash` nunca aparece em DTO de saída | PRD §6, RNF08 | Concluído (User.test.ts) |
| US-001 | Como usuário, quero me registrar com nome, e-mail e senha | PRD §13.2 | Concluído |
| US-002 | Como usuário, quero fazer login e receber um token válido | PRD §13.2 | Concluído |
| TASK-036 | Implementar hashing de senha (bcrypt) em `infrastructure/auth/` | ADR-004 | Concluído |
| TASK-037 | Implementar emissão e verificação de JWT em `infrastructure/auth/` | ADR-004 | Concluído |
| TASK-038 | Implementar `authMiddleware` (extrai `userId` do token, rejeita requisição sem token válido) | PRD §13.1, RN16 | Concluído — movido para `presentation/middlewares/authMiddleware.ts` (PRD §4) como factory `createAuthMiddleware(ITokenService)` via porta; erros JWT mapeados p/ `AppError` no `JwtTokenService.verifyAccessToken` (boundaries fix) |
| TASK-039 | (TDD) Testes de acesso a recurso de outro usuário (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`) no caso de uso, não no middleware | PRD §13.1, RN17, CONSTITUTION §9 | Concluído (GetUser/UpdateUserLayout — PROFILE_NOT_OWNED; Pause/Resume/Abandon/Submit — SESSION_NOT_OWNED) |
| TASK-034a | (TDD) Testes de refresh token: emissão, validação, rotação, revogação | ADR-010, ADR-004 | Concluído |
| TASK-034b | Implementar access token curto (15–30 min) + refresh token de vida longa em `infrastructure/auth/` | ADR-010, ADR-004 | Concluído |
| TASK-034c | Implementar endpoint `POST /auth/refresh` (valida refresh token → emite novo access token) | ADR-010, ADR-004 | Concluído (use case `RefreshToken`) |
| TASK-034d | Atualizar `authMiddleware` para aceitar access token curto e integrar fluxo de refresh | ADR-010, ADR-004 | Concluído (retorna `TOKEN_EXPIRED` ⇒ cliente chama `/auth/refresh`) |

---

## Fase 4 — Application (Use Cases)

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-040 | Implementar use cases: `RegisterUser`, `Login` | PRD §13.2, TASK-036/037 | Concluído (Fase 3) |
| TASK-041 | Implementar use cases: `GetUser`, `UpdateUserLayout` | PRD §7 (UserProfile), §13.1 | Concluído (+ `IUserProfileRepository`, `InMemoryUserProfileRepository`, `UserNotFoundError`) |
| TASK-042 | Implementar use cases: `GetLesson`, `ListLessons` (filtros `level`/`type`/`layout`) | PRD §8 (Lesson) | Concluído |
| TASK-043 | Implementar use cases: `StartTypingSession`, `PauseTypingSession`, `ResumeTypingSession`, `AbandonTypingSession` | PRD §9–§11 | Concluído (+ `recordKeystrokes` na entidade) |
| TASK-044 | (TDD) Testes de idempotência do `SubmitTypingSession` (submit duplicado não reprocessa) | ADR-008, RN14 | Concluído |
| TASK-045 | Implementar use case `SubmitTypingSession`: valida estado → calcula tempo ativo → processa eventos → calcula métricas → atualiza `KeyPerformance` → avalia mastery → atualiza `Progress` → idempotente | PRD §9, §10, §12, §14–§15, §18–§19, §22–§23, ADR-008, RN14, TASK-044 | Concluído (+ `setMetrics` na entidade: duração finalizada antes do cálculo das métricas) |
| TASK-046 | Implementar use case `GetReinforcementLesson` | PRD §24–§25 | Concluído |
| TASK-047 | Implementar use case `GetUserProgress` | PRD §22–§23 | Concluído |
| TASK-048 | Definir DTOs de entrada/saída para todos os use cases acima, garantindo que nenhum exponha `passwordHash` | CONSTITUTION §4 | Concluído (UserDTOs/LessonDTOs/SessionDTOs/ReinforcementLessonDTO/ProgressDTOs) |
| TASK-048a | (TDD) Implementar use case `GetNextPedagogicalLesson` — usa `PedagogicalProgressionEngine` + `ProgressCard` para determinar próxima lição | PRD §25, RN25, RN26, RN29 | Concluído |
| TASK-048b | (TDD) Implementar use case `SubmitProgressCard` — valida e persiste Cartão de Progresso | PRD §27, RN27, RN30 | Concluído (+ `SubmitProgressCardOutputDTO`) |
| TASK-048c | (TDD) Implementar use case `CheckErgonomicSafety` — valida desconforto, implementa regra de segurança RN28 | PRD §28, RN28 | Concluído (lança `DiscomfortSignaledError` `DISCOMFORT_SIGNALED` 422) |
| TASK-048d | (TDD) Implementar use case `StartFirstSession` — fluxo de inicialização com check-in ergonômico (RN24) | PRD §24, RN24 | Concluído (monta o primeiro cartão em memória; **não** persiste — evita pular a 1ª lição) |

---

## Fase 5 — Infrastructure

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-049 | Configurar TypeORM + SQLite, entidades de persistência e migrations | ADR-002, ADR-005 | Concluído (data-source + 6 EntitySchema + migration InitSchema + `npm run migrate`; driver better-sqlite3 conforme ADR-012) |
| TASK-050 | Implementar repositórios concretos: `TypeOrmUserRepository`, `TypeOrmLessonRepository`, `TypeOrmTypingSessionRepository`, `TypeOrmKeyPerformanceRepository`, `TypeOrmProgressRepository` | ADR-005, TASK-014 | Concluído (+ `TypeOrmUserProfileRepository` criado junto, exigido pela Fase 4; round-trip testado em sqlite :memory:) |
| TASK-051 | Implementar `INGramRepository` inicial com corpus estático de PT-BR curado | ADR-007, PRD §25 | Concluído* |

> \* Versão inicial em memória (`InMemoryNGramRepository`, usada pelos testes de domínio). A versão com corpus em arquivo/banco é a mesma implementação de persistência da TASK-049/050.
| TASK-052 | Valores validados em `authParams.ts`: `BCRYPT_SALT_ROUNDS=12`, `JWT_EXPIRATION=24h` (interino), `MIN_PASSWORD_LENGTH=8` | PRD §26, ADR-004, ADR-010 | Concluído |
| TASK-053 | Valor validado em `adaptiveParams.ts`: `ACTIVE_DURATION_EPSILON_MS=1000` | PRD §10, §26, ADR-010 | Concluído |
| TASK-054 | Investigar e mitigar risco de concorrência de escrita do SQLite sob o fluxo de submit (transação/lock otimista) | ADR-002, ADR-008 | Concluído (ADR-012: driver better-sqlite3 síncrono + `enableWAL` + `timeout` busy + `PRAGMA foreign_keys=ON`; lock otimista postergado — fluxo de submit já é idempotente, RN14/ADR-008) |
| TASK-054a | Criar migration `SeedPedagogicalCurriculum` com 80 lições do Curso-Digitacao.md mapeadas nas 7 fases pedagógicas | PRD §25, RN25, TASK-033f | Concluído |
> \* Entregue junto da TASK-033f: dataset em `src/infrastructure/database/seed/pedagogicalCurriculum.ts` + migration `1700000000005-SeedPedagogicalCurriculum` (INSERT OR IGNORE idempotente), com registro da migration 004 órfã em `SCHEMA_MIGRATIONS`/`ALL_MIGRATIONS`.

---

## Fase 6 — Presentation

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-055 | Configurar Express, error handler global com formato padronizado (RNF02) | PRD §28 (RNF02), CONSTITUTION §10 | Concluído |
| TASK-056 | Implementar rotas/controllers/validators de `/auth/register`, `/auth/login` | PRD §13.2, TASK-040 | Concluído |
| TASK-057 | Implementar rotas/controllers/validators de perfil (GET e PATCH layout) em `/users/me` — `userId` sempre extraído do token, nunca de parâmetro de rota | PRD §7, §13.1, RN17, TASK-041 | Concluído |
| TASK-058 | Implementar rotas/controllers/validators de `/lessons`, `/lessons/:id` | PRD §8 (Lesson), TASK-042 | Concluído |
| TASK-059 | Implementar rotas/controllers/validators de `/sessions/*` (create/pause/resume/abandon/submit) | PRD §9–§11, TASK-043/045 | Concluído |
| TASK-060 | Implementar rota `/me/reinforcement-lesson` — `userId` do token | PRD §24–§25, TASK-046 | Concluído |
| TASK-061 | Implementar rota `/me/progress` — `userId` do token | PRD §22–§23, TASK-047 | Concluído |
| TASK-062 | Aplicar `authMiddleware` a todas as rotas exceto `/auth/register` e `/auth/login` | PRD §13.1, RN16, TASK-038 | Concluído |
| TASK-062a | Implementar rota `GET /me/pedagogical-lesson` — retorna próxima lição baseada no ProgressCard | PRD §25, TASK-048a | Concluído |
| TASK-062b | Implementar rota `POST /me/progress-card` — recebe e valida Cartão de Progresso | PRD §27, TASK-048b | Concluído |
| TASK-062c | Implementar rota `POST /me/ergonomic-check` — valida check-in ergonômico inicial | PRD §24, TASK-048d | Concluído |

---

## Fase 7 — Integração e Não-Funcionais

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-063 | Testes end-to-end do fluxo completo: registro → login → criar sessão → digitar → submit → consultar progresso/reforço | PRD §30 (Fase 7: fluxo HTTP → caso de uso → domínio → repositório → banco) | Concluído |
| TASK-064 | Configurar Conventional Commits (hook de commit-msg) | CONSTITUTION §10 | Concluído |
| TASK-065 | Executar benchmark do RNF06 (p95 ≤150ms, 1500 eventos) no ambiente de referência definido no PRD §28, e ajustar se necessário | PRD RNF06 | Concluído |
| TASK-066 | Revisão de segurança: confirmar que nenhum log/erro/DTO vaza `passwordHash`, JWT completo ou detalhe interno de infraestrutura | CONSTITUTION §9, §11, RNF08 | Concluído |

---

## Retrofit — Idioma pt-BR (ADR-011)

Itens necessários porque as Fases 0–2 foram implementadas antes da `ADR-011` formalizar o escopo de idioma. Nenhum bloqueia a Fase 3 em andamento, mas devem ser resolvidos antes da Fase 6 (Presentation) expor os primeiros endpoints reais ao usuário final.

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-069 | Auditar `DomainError`, `AppError` e as chamadas de logger (Pino) já implementadas nas Fases 0–2; traduzir toda mensagem destinada a leitura humana para pt-BR, mantendo `code` e chaves estruturadas em inglês | ADR-011, PRD §1.1, §28.5 | Concluído |
| TASK-070 | Configurar mapa de mensagens customizado do Zod (`z.setErrorMap` ou mensagem por regra) para que `VALIDATION_ERROR` retorne texto pt-BR — o padrão da biblioteca é em inglês | ADR-011, PRD §28.5 | Concluído |
| TASK-071 | Centralizar o catálogo de erros (atualmente PRD §28.5; à época da execução, §28.1) como constantes em `shared/errors/ERROR_CODES.ts` (já referenciado em `AGENTS.md`), com `code` + `message` pt-BR por entrada — elimina string solta em controller | ADR-011, PRD §28.5, CONSTITUTION §10 | Concluído |
| TASK-072 | Revisar `TASK-055` (error handler global) para consumir o catálogo da TASK-071 em vez de mensagens ad-hoc | TASK-055, TASK-071 | Concluído |

---

## Itens fora de fase (reconhecidos, fora do escopo do Domain Core)

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-067 | Avaliar OAuth/login social, recuperação de senha por e-mail, rate limiting de tentativas de login | ADR-004 (§13.4 do PRD) | Concluído — ADR-013: OAuth e recuperação de senha mantidos fora de escopo (gatilhos definidos); rate limiting aprovado, implementação em TASK-073. Refresh tokens (item irmão do §13.4) já movidos para a Fase 3 (ADR-010) |
| TASK-068 | Avaliar migração de SQLite para PostgreSQL, caso o uso concorrente justifique | ADR-002, ADR-005 | Concluído — ADR-014: permanece SQLite; gatilhos objetivos de migração documentados |
| TASK-073 | Implementar rate limiting por IP em `/auth/login` e `/auth/refresh` (janela fixa em memória, parâmetros em `infrastructure/auth/rateLimitParams.ts`), retornando `429 TOO_MANY_REQUESTS` | ADR-013, PRD §28.5 | Concluído (porta `IRateLimiter` + `InMemoryRateLimiter` + `createRateLimitMiddleware` injetado nas rotas via composition; `TOO_MANY_REQUESTS` no catálogo `ERROR_CODES.ts`; cobertura em `rateLimitMiddleware.test.ts`/`InMemoryRateLimiter.test.ts`/`app.test.ts`) |

---

## Fase 8 — Migração de apresentação e stack: web (Next.js + Nest.js)

Decisão registrada em **ADR-016** (aceita). Esta fase **não altera nenhuma RN/RNF do PRD** — o domínio, os use cases e a RN14 (idempotência de submit) permanecem no backend e são **reutilizados** pela nova UI via REST; em hipótese alguma o navegador reimplementa regra de domínio (Clean Architecture, ADR-005). A distribuição final permanece em aberto (§ "A definir — distribuição"), sem bloquear a implementação (a UI Next é a mesma, independente do empacotador).

| ID | Item | Rastreável a | Status |
|---|---|---|---|
| TASK-074 | (ADR) Registrar ADR-016: substituir apresentação desktop (customtkinter/Tk, Python) por **Next.js** (App Router, TS, consumindo REST existente) e o backend **Express 5 → Nest.js**, reconciliando o ADR-002 (que descartava NestJS) e o PRD §13.4 (alternativa web "fora de escopo") | ADR-002, PRD §13.4 | Concluído — ADR-016 |
| TASK-075 | Inicializar `web/` (Next.js App Router + TypeScript strict + Tailwind) consumindo o backend REST existente em `src/` — sem reimplementar domínio no navegador (Clean Architecture) | ADR-016, ADR-005, PRD §13.3, §13.4 | Concluído (Next 15.5 + React 19 + Tailwind v4 + rewrites /api/*→localhost:3001, api client espelhando formato de erro, `eslint` isolado no web/) |
| TASK-076 | Portar a tela de sessão de digitação (View do customtkinter) para a rota Next — mesma semântica de RN14 (submit idempotente), RN22 (insufficient-data) e composição de tecla morta (RN02/DEAD_KEY) | ADR-016, RN02, RN14, RN22 | Concluído — `/app/lessons` lista lições e inicia sessão; `useTypingSession` (porta de `SessionController`/`TypingArea`): captura CORRECT/INCORRECT/CORRECTION (Backspace) e DEAD_KEY via IME (`beforeinput` + compositionend), latency entre keystrokes, live stats (PPM bruta/líquida, acurácia, latência, erros), pause/resume/abandon/auto-submit no fim; painel de resultado espelha `metrics` do backend e trata RN22 (`activeDurationMs<3000 || charactersTyped<5` → "sessão muito curta"); `ApiClient` ganhou `listLessons`/`getLesson`/`startSession`/`pauseSession`/`resumeSession`/`abandonSession`/`submitSession`; E2E via rewrite comprovado (start 201, submit 200, RN14 idempotente) |
| TASK-077 | Implementar a UI de dashboard/progresso (WPM, acurácia, latência, teclas fracas) consumindo os aggregates de métricas do backend — mesmo modelo RN06/RNF06 (150ms) e RN25 (WeakKeyScore/mastery) | ADR-016, RN06, RNF06, RN25 | **Concluído** — Backend: novo use case `GetUserKeyPerformance` (TDD 4 testes, `GET /me/key-performance`), fallback layout padrão ABNT2 quando perfil ausente (seguiu padrão de `GetReinforcementLesson`); DTOs/ports/composition-root/app.test wiring + rota; 552/552 lint+typecheck+test. Web: `web/models/progress.ts` (GetUserProgressDTO + KeyPerformanceDTO), `ApiClient.getProgress/getKeyPerformance`, página `/app/progress` (client): cards resumo (nível, lições completadas, progresso %, última sessão), próxima lição com CTA "Praticar", lista teclas fracas ordenada por WeakKeyScore+acurácia desc com badges mastery (RN25) + acurácia/latência/attempts/score; 6 teclas visíveis no smoke user; build web verde; E2E via rewrite validado |
| TASK-078 | Autenticação no Next: fluxo de login/refresh via cookie httpOnly (roteamento de refresh, ADR-013) e redirect de rotas protegidas | ADR-016, ADR-013, RN16, RN17 | Concluído — server actions (`login/register/refresh/logout`) gravam cookies httpOnly `ott_access`/`ott_refresh` (15m/30d) via next/headers; `AuthProvider` client injeta token no `ApiClient`, faz refresh bootstrap no mount e redireciona p/ `/login`; layout protegido `/app/*` sob `AuthProvider` + `AppNav`; rotas `/login` e `/register` com alternância; smoke test E2E via rewrite `/api/*` (register → login → `GET /users/me` 200, sem token 401) |
| TASK-079 | Decidir a distribuição final da UI web | ADR-016 | **Concluído — decisão A (navegador)** |
| TASK-080 | Validar a UI Next contra o RNF06 (p95 ≤ 150ms com toolbox de latência) no ambiente de referência do PRD §28 — **cena A**: o usuário abre o navegador local e digita o endereço (`localhost:3000`); nada a instalar | ADR-016, RNF06, PRD §28 | **Concluído** — novo harness `bench/benchHarness.ts` (buildApp com as 20 deps de `createApp`, seed de lição + 500 sessões, buildKeystrokes(1500), runAutocannon, printReport com veredito) extraído de `bench/submit.bench.ts` (baseline preservado, p95 39–43ms) e novo `npm run bench:cena-a` → `bench/cena-a.bench.ts`: backend in-process em temp DB na porta `CENA_A_BACKEND_PORT` (default 3101), Next em produção (`next build` com `BACKEND_URL` do build — rewrites do Next são resolvidas no build, não em runtime; porta `CENA_A_UI_URL` default `http://localhost:3000`). **Resultados (2 execuções consistentes, i7-1165G7 7.5GiB Node 25):** direto no backend 10 conexões/10s: p95 ≈ 40–43ms → **ATENDIDO**; via rewrite `/api` do Next com o mesmo autocannon 10 conexões: p95 ≈ 4.8s → **NÃO ATENDIDO** (gargalo é o proxy do Next sob carga concorrente de POSTs de 1500 eventos, não o backend — requisito/s ≈ 246); **cena A real** (1 usuário, sessão nova por submit, 1500 eventos via UI): frio ≈ 43–46ms, média sequencial ≈ 12ms, pico 19ms → **DENTRO DO BUDGET** |
| TASK-081 | (Parity/web) Confirmar que a nova UI retorna as mesmas métricas que o desktop para uma mesma sessão (WPM, acurácia, latência média, insufficient-data), como critério de aceite da migração | ADR-016, RN06, RN22 | **Concluído** — paridade METRICS confirmada por teste dedicado `src/application/use-cases/ParityWebDesktop.test.ts` (4 testes): para o mesmo episódio de digitação (teclas normais + INCORRECT + CORRECTION + compose correto/errado e mesmas latências), o payload idêntico do desktop (`KeystrokeEvent` c/ `to_camel`) e do web (`KeystrokeEventDTO`) produz **métricas idênticas** via `SubmitTypingSession` (WPM bruto/líquido, acurácia, latência média, insufficient-data). Achados corrigidos: (1) **bug web de compose** — `handleCompositionEnd` gravava `CORRECT` incondicionalmente; agora CORRECT/INCORRECT conforme o caractere composto e `logicalKey` = caractere composto (paridade com o desktop, RN12); (2) **bug MetricsEngine RN12** — CORRECTION real dos dois clientes tinha `logicalKey='Backspace'` e era descartado pelo guard `isControlKey()` (correctedErrors nunca contava); corrigido: CORRECTION/DEAD_KEY_COMPOSE contados antes do guard (teste RN12 com payload real adicionado). 557/557 testes + lint + typecheck + build web verdes; backend dev reiniciado e `/me/key-performance` verificado ao vivo |
| TASK-082 | (POO/reuso — política ADR-017) Aplicar POO na Fase 8 usando **classes** já existentes de `src/` (use cases, entidades, value objects) e do desktop — **reutilizar, não reescrever**: portar `src/application/use-cases/*` e `src/domain/*` intactos para o Nest.js, e consumi-los via REST no Next; **nenhuma RN é reimplementada no navegador** (RN14 idempotência, RN22 insufficient-data, RN13 dead-key permanecem no back-end) | ADR-017, ADR-016, ADR-005, RN14, RN22 | **Concluído** — Backend migrado para **Nest.js 12** reutilizando intactos `src/domain/**` e `src/application/use-cases/**` (nenhuma RN reimplementada; camada nova apenas em `presentation/nest/`). `nestTokens.ts` (DI por string tokens — ports são interfaces, sem emitDecoratorMetadata de tipo), `AuthGuard` (reusa `ITokenService` + `AppError`, seta `req.userId`), `AppExceptionFilter` (reusa `toAppError`/`AppError.toJSON` → RNF02; 404 → `NOT_FOUND: "Rota não encontrada"`), 7 `*NestController` (health/auth/user/lesson/session/progress/pedagogical) reutilizando os mesmos validators zod (pt-BR) e ports; `appNest.ts` (module `forRoot` testável) e `main-nest.ts` (composition espelhando `composition-root`: mesmos repos TypeORM, bcrypt, JWT, rate limiters `InMemoryRateLimiter` registrados via `app.use('/auth/login'|'/auth/refresh')`, body limit 1mb). **16 testes e2e** `nest-app.test.ts` (fakes no padrão de `app.test.ts`): register 201, login/refresh 200, 422 VALIDATION_ERROR pt-BR, 401/TOKEN_EXPIRED, 403 SESSION_NOT_OWNED, 404 NOT_FOUND, health, rotas protegidas. Smok e E2E real (SQLite temporário): /health, register, login, `/users/me` com JWT 200, sem token 401, `/lessons?level=1` protegida 200, rota inexistente 404. Suíte completa **573/573 + lint + typecheck verdes**; scripts `dev:nest`/`start:nest`; Express original preservado (`dev`/`start`) como fallback até a TASK-083 apontar produção para Nest |
| TASK-083 | (MVC apresentação — política ADR-018) Registrar o **protocolo MVC** da camada de apresentação (ADR-018) e aplicar no desktop (já é MVC: `models/views/controllers/services`) e na UI Next.js da Fase 8 — Views→Controllers→Services→REST; nenhuma RN na apresentação (RN14/RN16/RN17/RN22 permanecem no back-end) | ADR-018, ADR-016, ADR-017, RN14, RN16, RN17, RN22 | **Concluído** — registro (ADR-018 + SRD §1.2/§3 + desktop/README + AGENTS.md) e aplicação no Next.js: nova camada `web/controllers/` (`AuthController`, `UserController`, `LessonController`, `SessionController`, `ProgressController` + factory `createControllers()` compartilhando um `ApiClient`) consumindo o service `ApiClient`; Views refatoradas para não tocar o service diretamente — `app/app/lessons`, `app/app/progress`, `auth-provider` (getMe via `UserController`), `app/actions/auth` (server action como controller consumindo `AuthController`) e o hook `use-typing-session` (orquestra com `SessionController`). Web aponta para o Nest (`dev:nest`/`start:nest` + `BACKEND_URL` no build); `web/README.md` atualizado (tabela MVC + run Nest). Nenhuma RN na apresentação — idempotência RN14, insufficient-data RN22, auth RN16/17 permanecem no backend |
| TASK-084 | (Paridade dead-key) Emitir `DEAD_KEY_COMPOSE` real nos dois clientes quando uma sequência de composição inicia (US-International), com a latência do caractere composto medida do início do compose ao keydown final (PRD §11.3) | PRD §11.3, ADR-018, RN12 | **Concluído** — gap de paridade fechado: **web** (`web/hooks/use-typing-session.ts`) e **desktop** (`typing_area.py`) agora emitem `DEAD_KEY_COMPOSE` (`latencyMs: null`, `timestampMs` = início do compose) na entrada da composição e, no `composition end`, o caractere composto herda `latencyMs` = duração total do compose (web via override de `lastLatencyRef`; desktop via `_composition_start_time` → `_last_event_time`). `session_screen.py` não conta DEAD_KEY_COMPOSE no contador de teclas da UI. `ParityWebDesktop.test.ts` atualizado com o evento extra em ambos os payloads (desktop/web, correto/incorreto) e métricas re-verificadas — **573/573 backend + web typecheck + lint + 17 desktop tests** verdes |
| TASK-085 | (TDD) Reset de progresso no backend: repos com `deleteByUserId` (`ITypingSessionRepository`, `IKeyPerformanceRepository`, `IProgressCardRepository`, `IProgressRepository` + InMemory/TypeORM), use case `ResetProgress` (limpa sessões/KeyPerformance/ProgressCard/Progress e zera `UserProfile.currentLevel` para 1 preservando `activeLayout`), rota `DELETE /me/progress` no Nest (AuthGuard, posse RN17) | PRD §2.3.1 item 12, RN31, RN17, RN16 | **Concluído** — `deleteByUserId` nos 4 repos (interfaces + InMemory + TypeORM, com testes RN31), use case `ResetProgress` + `ResetProgress.test.ts` (limpa dados, preserva outro usuário, zera nível mantendo `activeLayout`, idempotente), `TOKENS.RESET_PROGRESS`/`ResetProgressPort`/`@Delete('progress')` no `ProgressNestController` e e2e (`200`/`401` no `nest-app.test.ts`). CORS do Nest passou a aceitar `DELETE` |
| TASK-086 | (Web) Botão "Recomeçar do zero" na página `/app/progress` com diálogo de confirmação pt-BR chamando `DELETE /me/progress` e recarregando o progresso para nível 1 / 0 lições | PRD §2.3.1 item 12, RN31, ADR-018 | **Concluído** — `resetProgress` em `api-client.ts`/`progress-controller.ts`, seção destrutiva com confirmação inline em `web/app/app/progress/page.tsx` chamando `DELETE /me/progress` e recarregando progresso/teclas; web build + typecheck verdes |
| TASK-087 | (TDD) Status visual por lição no backend: use case `GetLessonPerformance` agrega sessões `COMPLETED` por `lessonId` (`findCompletedByUserId`) em `attempts`/`bestAccuracy`/`lastAccuracy`/`status` (NOT_STARTED/MASTERED/REVIEW/PRACTICING conforme RN32), limiares em `adaptiveParams.ts`, rota `GET /me/lessons/performance` no Nest (AuthGuard, RN17) | PRD §27 RN32, §27.1, §26, §29, RN17, ADR-018 | **Concluído** — `LessonPerformanceEngine.computeLessonPerformanceStatus` (domínio puro, TDD), `GetLessonPerformance` (usa `findCompletedByUserId`), `LessonPerformanceDTOs`, `GET /me/lessons/performance` no Nest e Express com AuthGuard (RN17) + e2e (Express `app.test.ts` e Nest `nest-app.test.ts` — 620/620) |
| TASK-088 | (Web) Aplicar cores + ícone + rótulo do status RN32 na lista de lições `web/app/app/lessons/page.tsx` (precedência: Bloqueada > Próxima > status; acessível — nunca cor sozinha), consumindo `LessonController.getPerformance` | PRD §27 RN32, ADR-018 | **Concluído** — `LessonPerformanceDTO`/`LessonPerformanceStatus` em `web/models/lesson.ts`, `ApiClient.getLessonPerformance` (`GET /me/lessons/performance`), `LessonController.getPerformance`, badges com rótulo+cor (acessível, cor nunca sozinha) e precedência Bloqueada > Próxima > status em `lessons/page.tsx`; web typecheck + `next build` verdes |
| TASK-089 | (TDD) Pacing de prática backend (RN33): entidade `PracticePacingState` (domínio puro, relógio injetado) com `recordCompletedSession`/`isBreakRequired`/`breakRemainingMs`/`startNewBlock`; params `PRACTICE_BLOCK_DURATION_MS=900000`/`MIN_BREAK_DURATION_MS=180000` em `adaptiveParams.ts`; `BreakRequiredError` (BREAK_REQUIRED 409) + catálogo §28.5; porta `IPracticePacingRepository` (InMemory + TypeORM, `practice_pacing`, RN17); `StartTypingSession` recusa criar sessão quando break obrigatório; `SubmitTypingSession` acumula `activeDurationMs` na 1ª conclusão (RN14; ABANDONED não acumula — RN13); use case `GetPracticeStatus` + `GET /me/practice-status` no Nest e Express (AuthGuard) devolvendo `{accumulatedActiveMs, practiceBlockMs, minBreakMs, breakRequired, breakRemainingMs}` | PRD §27 RN33, §27.1, §26, §28.5, RN13, RN14, RN17, ADR-019, ADR-018 | Concluído |
| TASK-090 | (Desktop) Tela de pausa obrigatória (RN33) no `SessionScreen`: ao iniciar nova lição com `breakRequired`, exibir overlay de pausa com contagem regressiva de `breakRemainingMs` (já deduzidos do servidor) antes de liberar o Start; textos pt-BR em `strings.py`; consumir `GET /me/practice-status` via `SessionService`/controller (nenhuma RN no cliente — ADR-018) | PRD §27 RN33, ADR-019, ADR-018 | Concluído |
| TASK-091 | (Web) Overlay de pausa (RN33) em `web/app/app/lessons/page.tsx` + `use-typing-session.ts`: antes de iniciar nova lição, consulta `GET /me/practice-status`; se `breakRequired`, bloquear Start e mostrar contagem regressiva de `breakRemainingMs` (deduzido do servidor); acionado ao clicar em iniciar, sem hardcodar limites (ADR-018) | PRD §27 RN33, ADR-019, ADR-018 | Concluído |

---

## Distribuição — Decisão A registrada (ADR-016)

**Decisão tomada em 2026-09-14 (pergunta 3, respondida pelo responsável Dalmo Pereira): Opção A — site no navegador.** Registrada em **ADR-016** e refletida em `TASK-079 (Concluído)` e `TASK-080` (cena A). A Opção B (Tauri) foi **considerada e descartada nesta versão** — ver ADR-016 §"Alternativas consideradas".

**O que isto desbloqueia:**
* `TASK-079` — **Concluído** (decisão A registrada).
* `TASK-080` — **Concluído**: a cena A real (um usuário, `localhost:3000`, submit de 1500 eventos) fica **dentro do budget** (média ≈ 12ms, frio ≈ 45ms). O RNF06 no formato carga (autocannon, 10 conexões) **não é atendido pelo caminho do rewrite `/api` do Next** (p95 ≈ 4.8s — gargalo do proxy Next, não do backend, cujo p95 direto é ≈ 40ms).

**Resolução do follow-up RNF06 (chamada direta):** o gargalo é evitado em produção fazendo o navegador chamar o backend **diretamente** (sugestão registrada na própria TASK-080). Implementado: `NEXT_PUBLIC_API_URL` no build da web → `ApiClient` usa a URL direta no cliente (em vez de `/api/*`), e o Nest aceita origens via `CORS_ORIGINS` (lista separada por vírgula; vazio = sem CORS) com `allowedHeaders: content-type,authorization` e `methods: GET,POST,PATCH` (`main-nest.ts`). O auth não muda: acesso via header `Authorization: Bearer <accessToken>` (token em estado no cliente), refresh token continua em cookie httpOnly nas server actions — sem cookie cross-origin envolvido. Sem `NEXT_PUBLIC_API_URL`, o cliente cai de volta no rewrite `/api/*` (modo dev/mesma origem).

**Nota RN22 (descoberta na TASK-076):** o use case real `SubmitTypingSession` **não lança** `INSUFFICIENT_SESSION_DATA` — o `MetricsEngine` apenas zera WPM quando `activeDurationMs < 3000 || charactersTyped < 5` (RN22 "sem WPM"). O teste de 422 no `app.test.ts` usa um mock do use case, não o comportamento real. Web e desktop detectam insuficiência o mesmo jeito (metr. `netWpm`/`grossWpm` = 0). Verificar em **TASK-081 (paridade)** se o 422 deve ser entregue de verdade no backend.

**Resolução RN22 (TASK-081):** manter o comportamento atual (**sem** HTTP 422 no submit). O critério de aceite da TASK-081 (mesmas métricas, inclusive insufficient-data) é atendido: os dois clientes tratam insuficiência idênticamente pelas métricas (`activeDurationMs < 3000 || charactersTyped < 5` → WPM 0) e o painel web exibe "sessão muito curta". O 422 fictício do `app.test.ts` **foi removido** (resíduo de mock; o comportamento real — WPM 0 sem erro HTTP — segue coberto em `MetricsEngine.test.ts`, `SessionMetrics.test.ts` e `SubmitTypingSession.test.ts`).

**Nota DEAD_KEY_COMPOSE (TASK-081):** nem o desktop nem o web emitem o evento `DEAD_KEY_COMPOSE` (o backend o suporta, `MetricsEngine` conta sua latência, e o PRD/AGENTS.md preveem "latência do primeiro evento de compose ao keydown final"). Ambos medem o caractere composto como latência entre-keystrokes — paridade mantida, mas o caminho DEAD_KEY_COMPOSE do PRD segue **não implementado nas duas UIs**. Novo item de backlog sugerido: implementar a emissão de `DEAD_KEY_COMPOSE` (latência do compose) seguida de CORRECT/INCORRECT do caractere no web e no desktop.

**Nota dados legados (TASK-081):** o smoke user ainda possuía uma linha `KeyPerformance` com `logicalKey='DeadKey'` (gerada antes do fix do web, quando o compose usava `logicalKey='DeadKey'`). Após o fix, novos eventos de compose gravam o caractere composto (ex.: `á`). **Linha legada removida** do banco de desenvolvimento.

A decisão **não altera nenhuma RN/RNF do PRD** e não muda o Next.js — apenas elimina a fase de empacotamento (Tauri) desta versão.

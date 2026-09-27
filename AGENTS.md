# AGENTS.md — OpenType Tutor

Backend REST (Clean Architecture + DDD, NestJS) + UI web (Next.js). Layout monorepo: backend na raiz, UI em `web/`.

## Comandos

| Comando                                                    | O que faz                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                              | API com hot reload (`tsx watch src/main-nest.ts`)                                   |
| `npm run dev:web`                                          | UI web (`next dev`) — atalho de `npm --prefix web run dev`                          |
| `npm run dev:api`                                          | API na porta 3001 (use com `BACKEND_URL=http://localhost:3001`)                     |
| `npm run migrate`                                          | Aplica migrações manualmente (o boot já roda `runMigrations()`)                     |
| `npm run build` / `npm start`                              | Compila para `dist/` / roda `dist/main-nest.js`                                     |
| `npm run lint` / `lint:fix`                                | ESLint strict + `eslint-plugin-boundaries` + Clean Code (em `warn`)                 |
| `npm run typecheck`                                        | `tsc --noEmit` + `tsc -p tsconfig.bench.json` (cobre `src` **e** `bench/`, ADR-024) |
| `npm run test`                                             | Vitest uma vez — **não** aplica o threshold de cobertura                            |
| `npm run test:coverage`                                    | Vitest + cobertura v8 (é o que o CI roda; **aplica** os thresholds por tier)        |
| `npm run bench` / `bench:dashboard` / `bench:cena-a`       | autocannon (RNF06 / RNF11 / cena A)                                                 |
| `npm --prefix web run <lint\|typecheck\|test\|build\|dev>` | Gates da UI                                                                         |

Dev local sem configuração de env: `npm run dev` (API em 3000) + `npm run dev:web` (Next em 3001, faz rewrite de `/api/*` → `localhost:3000`).

**Ordem do gate: `lint → typecheck → test`**, depois bench. O CI (`.github/workflows/ci.yml`) roda **só o backend** — `web/` não é buildado, lintado nem testado no CI. Se você mudou a UI, rode os gates dela à mão.

## Um composition root só (ADR-024)

`src/nestRuntime.ts` é o **único** lugar onde o grafo de dependências é montado. Exporta três funções:

- `buildNestProviders(dataSource)` — o grafo: repos, use cases, tokens `TOKENS.*`.
- `createNestApp(dataSource, options?)` — sobe o `INestApplication` **completo**: providers, `AppExceptionFilter`, `useGlobalPipes` (json/urlencoded), CORS e rate limit. Faz `app.init()` mas **não** `listen()`.
- `createRuntimeDataSource()` — o `DataSource` de produção, com `runMigrations()`.

`src/main-nest.ts` virou um entrypoint fino de 21 linhas: `createRuntimeDataSource()` → `createNestApp()` → `listen(PORT)`. Ele não monta nada, só sobe.

**A pilha Express foi removida** (`composition-root.ts`, `presentation/app.ts`, `routes/`, `middlewares/`, `controllers/` — 23 arquivos, 2.404 linhas). Antes havia **quatro** cópias do mesmo grafo: `main-nest.ts`, `composition-root.ts`, `e2e/fullFlow.test.ts` e `bench/benchHarness.ts`. Hoje há **um** lugar, e o e2e e o bench consomem o mesmo `createNestApp` que o runtime — então não é mais possível exercitar um app diferente do que sobe em produção.

**Por que isso não era cosmético.** A divergência entre pilhas já custou três vezes, e nenhuma quebrou a suíte:

1. **404 em 6 rotas com 809 testes verdes.** `RequestPasswordReset`, `ConfirmPasswordReset`, `AdminResetUserPassword`, `GetAdminSettings`, `UpdateAdminSettings` e `GetLessonPacingStatus` estavam registrados em `composition-root.ts` e cobertos pelo e2e — mas não em `main-nest.ts`, o app que sobe. `npm run dev` devolvia 404. Os **ports** já existiam em `useCasePorts.ts`, o que explicava o 0% de cobertura daquele arquivo: interface sem consumidor.
2. **`POST /auth/admin/reset-user-password` anônima.** A rota morava no mount `/auth` (público por design) sem carregar `authMiddleware` nem `adminGuard` — o guard só protegia `/admin`. Qualquer cliente anônimo com um `userId` redefinia a senha de qualquer conta.
3. **`bench/` nunca typecheckado.** `tsconfig.json` tem `rootDir: "./src"` e `include` só de `src`, e `lint` é `eslint src`. O bench tinha **erros reais** (`TS2554` em `new RefreshToken(tokenService)`, `TS2345` nos 6 use cases ausentes): `npm run bench` estava quebrado em silêncio, sem gate que perceivesse.

O padrão: **divergência entre duas fontes de verdade não falha, ela só fica errada.** Com uma fonte, o caso de uso registrado existe por construção.

### O que pegar quando a divergência morre de vez

`nest-app.test.ts` exercita a rota HTTP no app Nest e **exige o código de negócio** (`expect(calls.getUser).toHaveBeenCalled()`), não só o status. Teste de porta não pega um caso de uso ausente, e o e2e também não pegava — o e2e rodava sobre o Express. O e2e hoje roda sobre `createNestApp`, que é o mesmo do runtime.

`src/e2e/fullFlow.test.ts` ganhou um bloco `ADR-013/ADR-024 - o rate limit está montado no app de runtime` com 3 testes, porque o limitador é registrado em `createNestApp` e não por decorator: **remover a linha de registro produz um app que responde 200 indefinidamente sem falhar um único teste de unidade.** O `rateLimitMiddleware.test.ts` prova a lógica com clocks injetados; o que ele não prova é que o limitador está montado, e em quais rotas, com qual política.

Os 3 testes foram validados por mutação (reverter a implementação e ver o teste falhar):

| Mutação                                        | Resultado                |
| ---------------------------------------------- | ------------------------ |
| Remover o registro do limitador                | `expected 401 to be 429` |
| Trocar a política de login pela de refresh     | `expected 429 to be 200` |
| Remover a exigência do prefixo `Bearer `       | `expected 200 to be 401` |
| Remover `.strict()` do schema de progress-card | `expected 201 to be 422` |

O caso do `Bearer` é o mais instrutivo: a primeira versão do teste mandava `Authorization: valid` (5 caracteres) e **passava com o guard quebrado** — `slice(7)` de uma string de 5 devolve `""`, que caía na checagem de vazio. O 401 vinha por acidente. Só um token de tamanho real (`eyJhbGciOiJIUzI1NiJ9...`) deixa resto não vazio em `slice(7)` e expõe o defeito. **Um teste que passa com a implementação quebrada não é teste; é decoração.**

**Um controller por política de acesso.** Rota pública e rota de admin não dividem classe. `PasswordResetNestController` (público) e `AuthAdminNestController` (`@UseGuards(AuthGuard, AdminGuard)` no nível da classe) estão separados do `AuthNestController` pelo mesmo motivo: `@UseGuards` por método é uma linha que dá para esquecer, e o esquecimento é silencioso porque a rota responde 200. No nível da classe, vale para todas as rotas **por construção**. Isso também mantém cada construtor em ≤ 4 parâmetros, o que `max-params` cobra (`authNestController` chegou a 6 e estourou o ratchet).

**O bench também entra no gate agora.** `tsconfig.json` tem `rootDir: "./src"`, então `bench/` não pode entrar no `include` dele. `tsconfig.bench.json` estende o principal com `noEmit` + `rootDir: "."` e inclui `src`/`bench`/`types`; `npm run typecheck` virou `tsc --noEmit && tsc -p tsconfig.bench.json`. `types/autocannon.d.ts` cobre o autocannon 8, que não publica tipos. O lint ainda **não** cobre `bench/` (`eslint src`) — dívida aberta.

Rodar os benches expôs o mesmo defeito que a pilha morta representava, agora no lado da medição: **verde onde a verdade é vermelho.** `printReport` só olhava `p95`, e **latência de erro é menor que a de sucesso** — um 404 em 2 ms tem p95 melhor que um 200 em 40 ms. No `cena-a` com a UI Next no ar errado o run "VIA UI" deu 8.815 de 8.815 em non-2xx, p95 de 24,6 ms, e imprimiu `RNF06: ATENDIDO`. Pior: `submit.bench.ts` e `dashboard.bench.ts` logavam a RNF perdida e saíam com **0**, então os jobs `bench` e `bench-dashboard` do CI não tinham como reprovar. Agora `non2xx > 0` reprova e os scripts setam `process.exitCode = 1` **depois** do cleanup. Medido: `bench` 3.003 req / 0 non-2xx / p95 40,4 ms (RNF06 ATENDIDO), `bench:dashboard` 20.390 req / p95 6,8 ms (RNF11 ATENDIDO).

`bench:cena-a` **não** está no CI e exige preparo (build do Next com `BACKEND_URL` apontando para a porta do backend do bench, depois `npm start` na 3000) — se rodar sem isso, a parte "VIA UI" falha com 404. Isso não é regressão: é a configuração documentada no cabeçalho do arquivo.

## Migrações: as duas listas, e o timestamp de 13 dígitos

`src/infrastructure/database/data-source.ts` mantém **duas** listas:

- `SCHEMA_MIGRATIONS` — só schema, sem seed. Usada por `createTestDataSource()`.
- `ALL_MIGRATIONS` — schema + seed. Usada pelo `createDataSource()` padrão (runtime, boot, `npm run migrate`, bench).

Toda migração de **schema** tem que estar nas **duas**. Divergir quebra o runtime sem quebrar a suíte, porque os testes usam `SCHEMA` e o banco real usa `ALL`. Foi assim que `AddUserRoleColumn1700000000015` ficou só na `SCHEMA` e deixou `POST /auth/register` e `POST /auth/login` em **500 `no such column: role`** em todo banco novo — `UserEntity` declara `role` como `NOT NULL` e `TypeOrmUserRepository` mapeia `row.role`. **Já corrigido** (015 em `ALL_MIGRATIONS`; `data/opentype.sqlite` migrado, 16 usuários com `role='user'`).

O describe `ADR-002/ADR-005 - paridade entre ALL_MIGRATIONS e SCHEMA_MIGRATIONS` em `data-source.test.ts` barra a regressão: monta as duas listas e compara o `sqlite_master` resultante. Ao criar uma migração de schema, acrescente nas duas e deixe o teste confirmar.

**Pegadinha de ordenação (verificada):** o TypeORM ordena por `parseInt(nomeDaClasse.slice(-13), 10)` (`node_modules/typeorm/migration/MigrationExecutor.js:432`) — **não** pela ordem do array, então reordenar o array não muda nada. `AddKeyMasteryTransitionTable17000000000010` e `AddDashboardHeatmapCounts17000000000011` têm sufixo de 14 dígitos e parseiam como `7000000000010`/`7000000000011`, então rodam **por último**, depois da 015. Não corrija renomeando as classes: o TypeORM casa pelo `name`, então a 011 re-executaria e estouraria `duplicate column name` em todo banco existente. E **não crie uma 016 que dependa de `key_mastery_transition` (010) ou de `daily_metrics_aggregate."keyCounts"` (011)** — ela rodaria antes das duas.

## Estado atual do working tree

**Gate medido em 2026-09-27, depois do ADR-024, na ordem `lint → typecheck → test` — VERDE:**

- `npm run lint` → **0 erros**, 43 warnings (exatamente no teto do ratchet, `--max-warnings 43`)
- `npm run typecheck` → passa em `src` **e** `bench` (`tsc --noEmit && tsc -p tsconfig.bench.json`)
- `npm run test` → **819 passando** em 81 arquivos, 0 falha

O número de warnings é um **snapshot de árvore em movimento**: se você editar `src/` enquanto o outro agente trabalha, reveja com `npm run lint:baseline` e ajuste o teto junto — um `--max-warnings` errado derruba o gate por um motivo que não é seu.

### O commit que passou no meu gate e estava vermelho

O ADR-024 foi commitado com `lint` medindo 44 no `prettier` ainda por rodar. O `prettier --write` do pre-commit reformatou `KeyPerformance.ts` (311 → 334 linhas) e `AdaptiveLessonEngine.ts` (212 → 240) e o resultado ficou em **47** — acima do teto. Duas funções cruzaram o `max-lines-per-function` **só porque o formatador quebrou linhas**: `recordSessionEnd` foi de 46 para 51, e `allocateCharacters` de 38 para 74. Nenhuma delas mudou de comportamento; só de tamanho.

Isso é a mesma classe de falha do ADR-024, em escala menor: **um gate medido antes da última transformação não mede o resultado dela.** O `lint-staged` era `eslint --fix` e depois `prettier --write` — o linter via o arquivo pré-formatação e o commit levava o arquivo pós-formatação. Invertido para `prettier --write` e depois `eslint --fix`.

Paguei as 4 violações em vez de subir o teto, e uma delas era código morto de verdade: **`generateReinforcementLesson` recebia `userId` e nunca lia o parâmetro** (`noUnusedParameters` está desligado no `tsconfig`, então nada o pegou). Removido, com os 13 call sites ajustados. Ele custava o `max-params`, e a extração do fallback do RN23 para `resolveTargetKeys` derrubou o `max-lines-per-function` junto. As outras duas: `allocateCharacters` (74 linhas) partido em `poolWeights` + `selectReinforcementPools` + `sortByRemainderThenPriority`, e `recordSessionEnd` (51 linhas) com o ramo de regressão do RN10 extraído para `applyRegressionCounter`.

Os dois trechos extraídos foram validados por mutação antes de_commitar_, porque refatorar regra de negócio só passa no gate se os testes já cobriam a regra:

| Mutação                                                     | Resultado                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| RN10: contador de regressão deixa de avançar (`+ 1` → nada) | 3 testes falham, incluindo _"deve regredir de MASTERED após 3 sessões não aprovadas"_         |
| RN19: inverter o desempate por resto decimal                | 1 teste falha: _"deve priorizar WEAK sobre CONSOLIDATING quando há empate no arredondamento"_ |

### Correções que fecharam a linha de base vermelha anterior

Os itens 1, 2 e 6 corrigiram defeitos **na pilha Express**, que foi removida no ADR-024. O código que eles descreviam não existe mais; o **raciocínio** é que fica — é ele que justifica as decisões registradas em "Um composition root só". Os itens 3, 4 e 5 são de código vivo e valem para sempre.

1. **`await` faltando no refresh (RNF08).** `RefreshToken.execute` virou `async`, mas `authController.refresh` fazia `res.json(this.refreshToken.execute(...))`. `res.json(Promise)` serializa `{}` — HTTP 200 com corpo vazio, então o cliente recebia 200 sem token. O lado Nest tinha sido corrigido; o Express não.
2. **`POST /auth/admin/reset-user-password` era anônima.** A rota mora no mount `/auth`, que é público por design (register/login/refresh), e não carregava `authMiddleware` nem `adminGuard` — o guard só protegia `/admin`. Qualquer cliente anônimo com um `userId` redefinia a senha de qualquer conta. A correção no Express (guards num **objeto** `AuthRouteGuards`, não em parâmetros posicionais — `max-params ≤ 4`) foi superada pela solução no Nest: **um controller por política de acesso**, com `@UseGuards` no nível da classe.
3. **`PasswordResetToken.create` vs `rehydrate` (500 em vez de 401).** `create` exige `expiresAt` no futuro, e o repositório TypeORM chamava `create` ao ler — então ler um token **expirado** (o caso mais comum, passado o TTL de 1h) estourava `Error('expiresAt deve ser no futuro')` dentro do repositório. Sem `code`, virava `AppError.internal` e a rota respondia **500**. A validação "no futuro" é da **criação**; o que vem do storage é fato, não intenção. `TypeOrmPasswordResetTokenRepository.fromRow` usa `rehydrate`. `create` também recebe `now` por parâmetro (o Clock do caso de uso) — com `new Date()` interno, um teste com Clock mockada rejeita token válido. Coberto por `TypeOrmPasswordResetTokenRepository.test.ts` ("cadeia completa: 401 TOKEN_EXPIRED, não 500").
4. **`toAppError` prefere a mensagem do `DomainError` ao catálogo.** Ele fazia `appErrorFromCode(error.code)`, que **descartava** a mensagem pt-BR específica do domínio: `TOKEN_EXPIRED` de um token de recuperação saía como "Token de acesso expirado" (o catálogo tem uma entrada só, compartilhada com o par access/refresh). `DomainError` é a autoridade sobre a própria violação — tem `code`, `statusCode` e mensagem; o catálogo é o fallback de quem chega sem mensagem própria. ADR-011 mantém a mensagem em pt-BR. Coberto por `nest-app.test.ts` (o filter devolvendo a mensagem do domínio, não a do catálogo).
5. **`RequestPasswordReset` não loga mais token em claro.** Era um `console.info` com e-mail **e** token em claro, contra a regra de nunca escrever token em log. O provedor de e-mail está fora de escopo (ADR-013), então em dev o token volta na resposta no campo `devToken` — e **só** quando `NODE_ENV` não for `production`. TTL em `domain/config/authParams.ts`.

Complemento do item 5: o `hashToken()` desses dois casos de uso é **identidade** (`return token`) — o token cru vira `tokenHash` no banco. É dívida de segurança conhecida, não resolvida aqui.

6. **6 use cases + 2 repos só existiam no composition root Express.** `RequestPasswordReset`, `ConfirmPasswordReset`, `AdminResetUserPassword`, `GetAdminSettings`, `UpdateAdminSettings` e `GetLessonPacingStatus` estavam registrados em `composition-root.ts` e cobertos pelo e2e, mas não em `main-nest.ts` — o app que sobe. `npm run dev` devolvia 404 nas 6 rotas com a suíte verde. Corrigido em `main-nest.ts` (2 repos instanciados + 6 tokens `TOKENS.*`) com `AdminNestController`, `PasswordResetNestController` e `AuthAdminNestController` novos, e `AdminGuard` (`presentation/nest/admin.guard.ts`) registrado nos providers — sem isso o DI quebra no boot. `AdminGuard` pressupõe que `AuthGuard` rodou antes (é ele que popula `req.role` do JWT), por isso a classe sempre lista `@UseGuards(AuthGuard, AdminGuard)`, nunca só `AdminGuard`. Hoje todo esse wiring está em `buildNestProviders` (`src/nestRuntime.ts`) — o lugar único.

Detalhe histórico do `max-params`: `createAuthRoutes` (Express) ganhou 5 parâmetros e estourou o limite; a correção de lá foi agrupar os guards num objeto `AuthRouteGuards`. No Nest o DI resolve construtor **por posição**, então objeto não caberia — a solução foi **split por política de acesso** (um controller por família de rota), que resolve o `max-params` sem objeto. Ver "Um controller por política de acesso".

## Arquitetura

```
src/
├── domain/           # lógica pura, ZERO deps externas
│   ├── config/       # adaptiveParams.ts (motor) · authParams.ts (auth/conta) · timeUnits.ts (conversões)
│   ├── entities/ value-objects/ services/ errors/ repositories/ interfaces/
├── application/      # casos de uso + DTOs
│   ├── use-cases/ dtos/ services/ ports/   # ports = interfaces p/ infra
├── infrastructure/   # TypeORM+SQLite, bcrypt, JWT, pino, rate limit, DI
│   ├── database/     # data-source, migrations/, seed/, testing.ts
│   ├── auth/ repositories/ logger/ rateLimit/ typeorm/
├── presentation/     # a ÚNICA pilha: nest/
│   ├── nest/         # *NestController, guards, AppExceptionFilter, TOKENS
│   ├── middlewares/  # rateLimitMiddleware (montado pelo Nest via app.use)
│   ├── validators/ validation/ errors/ ports/
├── e2e/              # fullFlow.test.ts (HTTP → use case → domain → repo → SQLite)
└── nestRuntime.ts    # composition root ÚNICO · main-nest.ts = entrypoint fino
```

Regra de dependência: `presentation → application → domain ← infrastructure`. `domain/` nunca importa `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, `pino`. DI é manual no composition root; no Nest os ports são resolvidos por **string token** (`presentation/nest/nestTokens.ts`) — não há container de tipos porque `emitDecoratorMetadata` não sobrevive a interfaces.

**Ao adicionar rota, use case ou repo:** um único lugar — `buildNestProviders` em `src/nestRuntime.ts`, mais o token em `nestTokens.ts`. Não existe segundo root para esquecer.

### Imports (erro fácil)

- `tsconfig` é `module: NodeNext` → **todo import relativo precisa da extensão `.js`**: `import { X } from './foo.js'`. Sem isso o build quebra.
- O alias `@/*` → `src/*` existe no tsconfig e no vitest, mas **não é usado em lugar nenhum de `src/`** (0 ocorrências). Siga a convenção real: caminho relativo.
- `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` ligados → indexar array/objeto dá `T | undefined`.

### Fronteiras de lint (`eslint.config.mjs`)

| Camada             | Pode importar                                                                                      | Não pode                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `domain/*`         | `domain`, `shared`                                                                                 | `application`, `infrastructure`, `presentation`, `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, `pino` |
| `application/*`    | `application`, `domain`, `shared`                                                                  | `infrastructure`, `presentation`, `express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `pino`                       |
| `infrastructure/*` | + `domain`, `application`, `shared`, `bcrypt`, `jsonwebtoken`, `pino`, `typeorm`, `better-sqlite3` | `presentation`, `express`                                                                                      |
| `presentation/*`   | + `express`, `zod`, **`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`**               | `infrastructure`, `typeorm`, `bcrypt`, `jsonwebtoken`, `pino`                                                  |

Categorias de arquivo que furam a regra (não são camadas): `**/*.test.ts`, e a categoria `composition` — que desde ADR-024 cobre **`src/nestRuntime.ts` e `src/main-nest.ts`** (qualquer externo). Antes havia duas categorias (`composition` para o root Express, `nest-composition` para o Nest); hoje há uma, porque há um root. `bench/`, `scripts/`, `*.config.*` e `*.md` são ignorados pelo ESLint.

### Clean Code no lint (`CONSTITUTION.md` §2.1, ADR-023)

Limites: `complexity ≤ 10`, `max-lines ≤ 300`, `max-lines-per-function ≤ 50`, `max-depth ≤ 4`, `max-params ≤ 4`, `no-magic-numbers` (ignora `0`, `1`, `-1`, `2`, `100`, códigos HTTP, índices e defaults; `enforceConst` — constante nomeada não é magic number).

**Todas em `warn`, não `error`.** O alvo é `error` em todos os tiers; o flip é a constante `CLEAN_CODE_SEVERITY` no topo do `eslint.config.mjs`. Dívida medida: **43** — `domain` 14, `application` 14, `presentation` 9, `infrastructure` 4, composition root 2. Por regra: `no-magic-numbers` 14, `complexity` 12, `max-lines-per-function` 8, `max-params` 7, `max-lines` 2.

**Ratchet: `npm run lint` roda com `--max-warnings 43`** — violação nova quebra o gate, violação paga é teto abaixado. O teto só desce; para subir, justifique em review. `npm run lint:baseline` roda sem o teto, para medir. O CI executa `npm run lint`, então o ratchet vale no pipeline. Zerar a dívida é o caso limite `--max-warnings 0`, que é o flip para `error`.

**O `lint-staged` formata ANTES de linar, e a ordem é load-bearing.** Era `eslint --fix` e depois `prettier --write`, e isso entregou um commit **vermelho** sem ninguém perceber: o ESLint mediu 44 num arquivo de 311 linhas, o prettier reformatou para 334, e `recordSessionEnd` passou de 46 para 51 linhas — cruzando o `max-lines-per-function`. Como nada mede o lint depois do prettier, o ratchet só apareceu na leitura seguinte, já com o commit no `HEAD`. O detalhe que torna isso possível: **`max-lines` e `max-lines-per-function` medem linhas**, então são as duas regras que um reformat piora sem tocar em lógica — o `complexity` e o `no-magic-numbers` são imunes a formatação. Hoje a ordem é `prettier --write` e depois `eslint --fix`, que é a única que deixa o linter olhar o arquivo final; invertê-la de volta reintroduz o buraco.

Exceções: migrações, seeds e corpus (`max-lines`, `max-lines-per-function`, `no-magic-numbers` off — o corpus é `src/infrastructure/repositories/phraseCorpus.ts`); `*.test.ts` (`no-magic-numbers`, `max-lines`, `max-lines-per-function` off — mas `complexity` e `max-params` valem); composition root (`src/nestRuntime.ts` + `src/main-nest.ts`, `max-lines` off — é wiring de bootstrap, medir estilo ali polui o sinal); `src/domain/config/**` (`no-magic-numbers` off — é o lar dos parâmetros, medir a regra ali proibiria o próprio remédio).

**Onde um número inlineado vai — e a distinção que importa.** `no-magic-numbers` não é a regra de projeto; a §3 é. Os três lares em `src/domain/config/` não são intercambiáveis: `adaptiveParams.ts` e `authParams.ts` são **parâmetros** (peso, threshold, TTL — mudam por decisão de produto), `timeUnits.ts` são **unidades** (`MS_PER_MINUTE`, `MS_PER_DAY`, `CHARS_PER_WORD` — não mudam por decisão). O critério é o do número, não o do arquivo: unidade vai para `timeUnits.ts` mesmo quando o arquivo não toca em parâmetro de produto. `MetricsEngine` e `DailyMetricsAggregate` faziam a mesma divisão de WPM (`/5`, `/60000`) em arquivos sem qualquer relação com o motor adaptativo — é por isso que `timeUnits.ts` existe separado de `adaptiveParams.ts`, e por isso `authParams.ts` importa `MS_PER_MINUTE` de lá em vez de repetir `60 * 60 * 1000`.

Códigos HTTP foram isentos do `no-magic-numbers` porque são constantes da RFC 9110 e a regra não tem consciência de protocolo (43 das 115 violações da primeira medição). **Isso não endossou o código**: `DomainError.statusCode` dentro de `src/domain/` é vazamento de arquitetura e está aberto como dívida em ADR-023 item 10.

## Testes

- Vitest, `include: src/**/*.test.ts`, `environment: node`. Web usa `jsdom` + `web/test/setup.ts`.
- Cobertura com threshold **por glob** (`CONSTITUTION.md` §7), stmts/funcs/branches — só `test:coverage` aplica: `domain` 90/90/90 · `shared` 85/100/70 · `application` 80/80/75 · `infrastructure` 75/75/75 · `presentation` 70/70/60, piso global 60. `src/main-nest.ts` fica **fora** do threshold (coberto pelo e2e). Valores são ratchet: abaixo do baseline, para barrar só código novo ou piorado.
- **O e2e sobe o app real** (`createNestApp`, o mesmo do runtime), não um app montado à parte. Antes ele rodava sobre o Express — ou seja, não exercitava o app que sobe em produção, e era por isso que 6 rotas podiam responder 404 no Nest com o e2e inteiro verde.
- **Um teste que passa com a implementação quebrada não é teste.** Antes de dar por coberto, reverta a implementação e veja o teste falhar. O caso do prefixo `Bearer ` é o exemplo canônico: um token de 5 caracteres faz `slice(7)` devolver `""` e o 401 vem da checagem de vazio, não da exigência do prefixo — o teste passava com o guard quebrado.
- Nome de teste rastreia a regra: `RN14 - submit de sessão já completada não reprocessa`.
- Focado: `npx vitest run -t "RN14"` (por nome) ou `npx vitest run src/domain/entities/User.test.ts` (por arquivo).
- `src/infrastructure/database/testing.ts` dá dois flavors: `createTestDataSource()` (só `SCHEMA_MIGRATIONS`, sem seed) e `createSeededTestDataSource()` (todas, com currículo). As duas lists devem produzir o **mesmo schema** — é o que o describe de paridade em `data-source.test.ts` garante.

## Env e portas

| Varável               | Onde                                                | Default                                                         |
| --------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `PORT`                | API                                                 | `3000`                                                          |
| `DB_PATH`             | `infrastructure/database/databaseParams.ts`         | `./data/opentype.sqlite` (pasta `data/` é gitignored)           |
| `JWT_SECRET`          | `infrastructure/auth/secrets.ts`                    | `dev-secret-change-in-production` — **obrigatório em produção** |
| `CORS_ORIGINS`        | `main-nest.ts`                                      | vazio = **CORS desligado** (lista separada por vírgula)         |
| `BACKEND_URL`         | `web/next.config.ts` + `web/services/api-client.ts` | `http://localhost:3000`                                         |
| `NEXT_PUBLIC_API_URL` | `web/services/api-client.ts` (build-time)           | vazio = usar o rewrite `/api` do Next                           |

Se `NEXT_PUBLIC_API_URL` estiver setado, o browser chama o backend direto (exige `CORS_ORIGINS`). Não é otimização opcional: o rewrite do Next é o gargalo sob carga (RNF06 — p95 ≈ 40 ms direto vs ≈ 4,8 s via proxy). Backend e Next disputam a 3000 em dev; o Next auto-incrementa, mas se você usar `dev:api` (3001) precisa apontar `BACKEND_URL=http://localhost:3001`.

## Regras de domínio (PRD, RN01–RN40 / RNF01–RNF11)

- **RN09/RN10** maestria: `accuracy ≥ 0.95` **AND** `attempts ≥ 30` **AND** `avgLatency ≤ 500ms`, por 3 sessões aprovadas **consecutivas** → `MASTERED`; 3 não aprovadas → regressão. Dois contadores (`consecutiveMasterySessions`, `regressionSessions`) nunca sobem juntos. `KeyAccuracy = 1 − ErrorRate` (RN20).
- **RN12** `CORRECTION` conserta erro existente, nunca cria novo.
- **RN14** submit idempotente: sessão `COMPLETED` devolve o resultado cacheado.
- **RN16/RN17** auth extrai `userId` do JWT; posse checada no use case (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`).
- **RN19** desempate de arredondamento dos pools: `WEAK > CONSOLIDATING > MASTERED`.
- **RN21** `FinalUncorrectedErrors = max(0, TotalErrors − CorrectedErrors)`.
- **RN22** sessão `< 3000ms` de duração ativa **ou** `< 5` caracteres → `insufficient-data`, sem WPM.
- **RN33/RN34** pacing: 15 min de prática → pausa ≥ 3 min; macro-pausa de 3h a cada 3 lições.
- Layouts são isolados: `KeyPerformance` é chaveada por `(userId, logicalKey, layout)` — ABNT2 ≠ US-INTERNATIONAL. Dead keys em US-INTERNATIONAL: latência do primeiro compose até o keydown final, um erro por caractere composto.

Tudo isso vem de `adaptiveParams.ts` / `authParams.ts` — **nunca hardcode**, edite o parâmetro central.

## Política de idioma (ADR-011)

`message` de erro, log para humano e conteúdo de lição em **pt-BR**; `code` de erro, identificadores, rotas e commits em **inglês**. Catálogo code→message em `src/shared/errors/ERROR_CODES.ts` (fonte: PRD §28.5) — não faça string de erro inline no controller. Validação Zod passa por `parseSchema` de `presentation/validation/zodErrorMap.ts` (error map pt-BR) — não use `schema.parse` direto, ou a resposta vira inglês.

## Outros gotchas

1. **Sem `passwordHash` em DTO** — exclusão explícita no mapeamento entidade→DTO (CONSTITUTION §4).
2. **`DomainError` vs `AppError`** — regra de negócio vs mapeamento HTTP (presentation). `toAppError` faz a ponte; o Nest usa `AppExceptionFilter` sobre ele.
3. **JWT** — payload só `userId`; nunca email, hash ou token em log.
4. **SQLite** — WAL ligado e `busy_timeout` de 5 s (`databaseParams.ts`); o risco de write-lock no submit concorrente (TASK-054) já foi mitigado. Migrations rodam no boot, mas registro em produção ainda pede `PRAGMA journal_mode` e `synchronize: false` (já é o default).
5. **`DELETE /me/progress`** (ResetProgress) existe só no Nest — sempre existiu, e a UI não chama. Não há mais pilha Express para sincronizar; registre o caso de uso em `buildNestProviders`.
6. **UI web é MVC de apresentação (ADR-018)** — o fluxo é `web/app/` (views) → `web/controllers/` → `web/services/` → REST. **Nenhuma RN no cliente**: RN14, RN22, RN13 dead-key e RN16/17 ficam no backend. Modelos em `web/models/` são DTOs, nunca entidades de domínio.

## Commits

Husky `commit-msg` roda commitlint (Conventional Commits) e `pre-commit` roda lint-staged. Tipos permitidos: `feat fix refactor test docs chore perf build ci revert style`. Subject ≤ 72 chars, header ≤ 100, sem caps no início. O lint-staged roda `eslint --fix` + `prettier --write` nos staged — e `prettier --write` também em `*.md`, que **reformata as tabelas gigantes** de `PRD.md`/`BACKLOG.md`; revise o diff antes de commitá-las. Não há `.prettierrc` (defaults).

## Referências

| Arquivo           | Uso                                                                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRD.md`          | fonte da verdade: RN01–RN40, RNF01–RNF11, catálogo de erros                                                                                                                                                                                         |
| `SRD.md`          | container Sommerville; referencia o PRD, não duplica (ADR-015)                                                                                                                                                                                      |
| `UI-UX-SRD.md`    | especificação de UI/UX da web                                                                                                                                                                                                                       |
| `CONSTITUTION.md` | princípios (TDD, SDD, fronteiras, segurança)                                                                                                                                                                                                        |
| `ADR.md`          | decisões técnicas (ADR-001…ADR-024; ver 017 Nest, 018 MVC, 022 web-only, 024 composition root único)                                                                                                                                                |
| `BACKLOG.md`      | tarefas executáveis com rastreabilidade — **algumas notas estão desatualizadas** (ex.: TASK-073 e TASK-077 ainda citam `app.test.ts`/`composition-root`, removidos no ADR-024; TASK-082 cita `dev:nest`/`start:nest`, scripts que não existem mais) |
| `DESIGN.md`       | design de UI                                                                                                                                                                                                                                        |
| `README.md`       | setup, env, scripts, visão da API                                                                                                                                                                                                                   |

## graphify

Existe um grafo de conhecimento em `graphify-out/`, mas a pasta é **gitignored** — num clone novo ela não existe. Só use se `graphify-out/graph.json` estiver presente.

- Antes de garimpar o código, rode `graphify query "<pergunta>"`; `graphify path "A" "B"` para relações e `graphify explain "<conceito>"` para um foco. O resultado é um subgrafo pequeno — bem menor que `GRAPH_REPORT.md` ou grep cru.
- `graphify-out/wiki/index.md` serve de navegação; `GRAPH_REPORT.md` só para revisão arquitetural ampla.
- Após mexer no código, `graphify update .` (AST, sem custo de API). Arquivos de graphify sujos são esperados.

# Architecture Decision Records (ADR)

## OpenType Tutor — Backend REST API

Cada ADR documenta uma decisão técnica pontual. Formato padronizado: **Número + Título, Data, Responsável, Status, Contexto, Decisão, Justificativa, Alternativas Consideradas, Consequências e Referências.**

- **Padronização:** todos os ADRs seguem o mesmo template acima, facilitando navegação e entendimento por qualquer pessoa — antiga ou nova no projeto.
- **Rastreabilidade:** cada ADR tem número único; decisões que alteram uma ADR anterior referenciam a que **superam** em vez de reescrever o conteúdo.
- **Versionamento:** a seção Data registra quando a decisão entrou neste log; decisões aceitas não são reescritas em conteúdo — se precisarem mudar, são **superadas** por uma nova ADR que referencia a anterior, preservando o histórico (ver `CONSTITUTION.md`, Seção 11).
- **Acesso:** log único e versionado no repositório (`ADR.md`), revisado em conjunto com `PRD.md` e `BACKLOG.md`.

> As datas de registro dos ADRs 001–014 são retroativas: a consolidação histórica das decisões neste log ocorreu em 2026-09-11, quando o projeto ainda não tinha histórico de commits. A partir desta data, ADRs novos registram a data real da decisão.

---

## ADR-001 — Linguagem de implementação: TypeScript em modo strict

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O domínio exige modelagem precisa (sessões, métricas, `KeyPerformance`) e cálculos numéricos críticos (WPM, WeakKeyScore, mastery). Erros de tipo em tempo de execução seriam difíceis de depurar e comprometeriam a confiabilidade dos cálculos e da integridade dos dados de múltiplos usuários.

**Decisão:** TypeScript em modo `strict` para todo o código (`domain/`, `application/`, `infrastructure/`, `presentation/`, `shared/`).

**Justificativa:** A verificação estática de tipos é o mecanismo mais barato para proteger contratos de domínio (interfaces, value objects) e fórmulas numéricas críticas: detectar um erro de tipo em tempo de compilação custa consideravelmente menos do que depurá-lo em tempo de execução em um serviço multiusuário.

**Alternativas consideradas:** JavaScript puro — descartado por não oferecer verificação estática.

**Consequências:**

- (+) Contratos de domínio (`IProgressRepository`, `KeyPerformance`, etc.) verificáveis em tempo de compilação.
- (+) Refatoração mais segura.
- (−) Curva de configuração inicial maior.

**Referências:**

- Documentação oficial do TypeScript (incl. `strict`): https://www.typescriptlang.org/docs/

---

## ADR-002 — Stack de backend: Node.js + Express + TypeORM + SQLite

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O projeto é um serviço REST multiusuário, com objetivo explícito de aprendizado de arquitetura de software moderna (Clean Architecture, DDD, SOLID), não um MVP comercial sob pressão de prazo. Precisa de um runtime simples de operar localmente/individualmente, com caminho de evolução para um banco mais robusto sem reescrever regra de negócio.

**Decisão:**

- **Runtime/linguagem:** Node.js + TypeScript.
- **Framework HTTP:** Express — minimalista, não impõe estrutura sobre `domain/`/`application/`, favorece a regra de dependência da Seção 3 do PRD.
- **ORM:** TypeORM — mesma escolha do protótipo client-side anterior (consistência de conhecimento acumulado), suporta múltiplos dialetos de banco sem trocar de ORM.
- **Banco de dados:** SQLite em arquivo — zero-ops para um projeto individual/de aprendizado, sem custo de infraestrutura externa.

**Justificativa:** O propósito do projeto (praticar arquitetura) muda o cálculo de custo-benefício frente a uma stack "de produção": o runtime precisa ser simples de operar por um único desenvolvedor localmente; o Web framework não pode competir com a estrutura de camadas do PRD; e a persistência deve oferecer um caminho barato de evolução (ver ADR-005) sem exigir infraestrutura externa nesta fase.

**Alternativas consideradas:**

- NestJS — descartado por impor uma estrutura opinativa (decorators, módulos) que compete com a estrutura de Clean Architecture definida no PRD, adicionando complexidade não essencial ao objetivo de aprendizado.
- Prisma no lugar do TypeORM — descartado por menor familiaridade prévia e por o TypeORM já ter sido validado no protótipo anterior.
- PostgreSQL desde o início — descartado nesta fase por exigir infraestrutura externa (servidor de banco) sem benefício imediato para um único desenvolvedor operando localmente; a porta `IUserRepository`/etc. mantém essa troca barata no futuro (ver ADR-005).

**Consequências:**

- (+) Ambiente de desenvolvimento roda com `npm install` + um arquivo `.sqlite`, sem Docker/serviço externo.
- (+) Troca de banco no futuro é uma nova implementação de repositório, não uma reescrita de domínio (Dependency Inversion, ver ADR-005).
- (−) SQLite tem limitações reais de concorrência de escrita sob carga — aceitável para o escopo atual (uso individual/portfólio), documentado como risco conhecido, não ignorado (mitigação no ADR-012).

**Referências:**

- Express: https://expressjs.com/
- TypeORM: https://typeorm.io/
- SQLite: https://www.sqlite.org/

---

## ADR-003 — Arquitetura em camadas: Clean Architecture + DDD

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** Mesmo racional do ADR-004 do protótipo anterior: o projeto tem finalidade explícita de prática de arquitetura em camadas e princípios SOLID, o que muda o cálculo de custo-benefício frente a uma estrutura simples.

**Decisão:** Estrutura em camadas conforme PRD Seção 4 (`domain/`, `application/`, `infrastructure/`, `presentation/`, `shared/`). Regra de dependência: `presentation → application → domain ← infrastructure`. Domínio nunca importa de `infrastructure/`, `presentation/` ou bibliotecas externas (Express, TypeORM, bcrypt, jsonwebtoken, Zod). Enforcement via lint (`eslint-plugin-boundaries`), formalizado em `CONSTITUTION.md` Seção 1.

**Justificativa:** O objetivo do projeto é praticar a separação de camadas e os princípios SOLID, não entregar endpoints no menor tempo possível — sob esse propósito, o custo do boilerplate e da indireção é um investimento deliberado, e a regra de dependência precisa ser imposta por ferramenta para não degradar silenciosamente com o tempo.

**Alternativas consideradas:** Estrutura simples (`routes/`, `services/`, `db/`) — descartada pelo mesmo motivo do protótipo anterior: o objetivo do projeto é praticar a separação de camadas, não apenas entregar endpoints no menor tempo possível.

**Consequências:**

- (+) Fronteiras claras entre regra de negócio e detalhe técnico (HTTP, ORM, hashing, JWT).
- (+) Testes de domínio não dependem de banco, servidor HTTP ou bibliotecas de infraestrutura (RNF07 do PRD).
- (−) Mais boilerplate e indireção que uma estrutura simples — aceito conscientemente.

**Referências:**

- The Clean Architecture (Robert C. Martin): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Domain-Driven Design (Eric Evans): https://domainlanguage.com/ddd/
- `PRD.md` Seção 4; `CONSTITUTION.md` Seção 1

---

## ADR-004 — Autenticação: JWT stateless + bcrypt

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O PRD anterior a esta versão não definia nenhuma estratégia de autenticação, apesar de já expor endpoints por `userId` para um serviço multiusuário — uma lacuna funcional real identificada em revisão técnica. É necessário provar identidade sem acoplar o domínio a uma biblioteca de auth específica.

**Decisão:**

- Senhas: hash com **bcrypt** (`saltRounds` configurável, nunca hardcoded — ver `adaptiveParams`/`authParams`).
- Sessão de autenticação: **JWT stateless** assinado pelo servidor, carregando `userId` como claim principal.
- Verificação: `authMiddleware` em `presentation/middlewares/`, executado antes de qualquer controller protegido; extrai e valida o token, injeta `userId` autenticado no contexto da requisição.
- O domínio nunca recebe senha, token ou header — apenas o `userId` já resolvido, passado pelo caso de uso.

**Justificativa:** O serviço é multiusuário, então a identidade precisa ser provada em cada requisição; a escolha de um mecanismo stateless simplifica a operação (sem infraestrutura de sessão) e o isolamento da biblioteca de auth em `infrastructure/` mantém a regra de dependência da ADR-003 intacta.

**Alternativas consideradas:**

- Sessões stateful (cookie + storage server-side) — descartado por exigir infraestrutura adicional de sessão (ex.: Redis) sem benefício claro no escopo atual de aprendizado/portfólio.
- OAuth/login social — descartado nesta fase por complexidade desproporcional ao objetivo do Domain Core; pode ser adicionado depois sem alterar o modelo de `User` (apenas um novo fluxo de emissão de token).
- Refresh tokens — adiado; o escopo atual aceita reautenticação por expiração simples do JWT (revisitado no ADR-010 e implementado na Fase 3).

**Consequências:**

- (+) Serviço permanece stateless, simplificando escalabilidade futura.
- (+) Domínio permanece isolado de bibliotecas de auth (`jsonwebtoken`, `bcrypt` só existem em `infrastructure/`).
- (−) Revogação de token antes da expiração não é trivial em JWT stateless puro — aceito como limitação conhecida desta fase; não há funcionalidade de "logout forçado" no MVP.
- Parâmetros de segurança (`BCRYPT_SALT_ROUNDS`, `JWT_EXPIRATION`, `MIN_PASSWORD_LENGTH`) ficam centralizados e marcados "A VALIDAR" (PRD Seção 26), nunca hardcoded no meio da lógica de autenticação (validados no ADR-010).

**Referências:**

- RFC 7519 (JSON Web Token): https://datatracker.ietf.org/doc/html/rfc7519
- bcrypt (node): https://github.com/kelektiv/node.bcrypt.js
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## ADR-005 — Estratégia de troca futura de banco de dados

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** SQLite (ADR-002) é adequado para uso individual, mas existe possibilidade real de migrar para PostgreSQL se o projeto evoluir para uso concorrente/multiusuário real. O custo dessa troca depende de como a dependência de persistência é isolada hoje.

**Decisão:** `domain/` e `application/` nunca dependem de uma implementação concreta de banco. Toda persistência passa por uma interface definida em `domain/repositories/` (`IUserRepository`, `ILessonRepository`, `ITypingSessionRepository`, `IKeyPerformanceRepository`, `IProgressRepository`, `INGramRepository`). A implementação concreta (TypeORM + SQLite) fica em `infrastructure/repositories/`, injetada na composição da aplicação.

**Justificativa:** O custo da futura migração a PostgreSQL é determinado pela forma como a dependência de persistência é isolada hoje: se o domínio dependesse de um mecanismo de storage concreto, a troca reescreveria regra de negócio; com portas de repositório, a troca é apenas uma nova implementação + composição.

**Alternativas consideradas:** Acesso direto ao TypeORM dentro de `domain/services/` — descartado por acoplar `MetricsEngine`/`AdaptiveLessonEngine`/`ProgressionEngine` a um mecanismo de storage específico.

**Consequências:**

- (+) Trocar SQLite por PostgreSQL exige apenas uma nova implementação de repositório + composição — sem alterar os serviços de domínio.
- (+) Testes unitários de domínio podem usar repositórios em memória (fakes), sem SQLite real.
- Migração de dados existentes ao trocar de banco deve ser tratada como migração versionada, nunca como reset (ver `CONSTITUTION.md`, Seção 8).

**Referências:**

- Dependency Inversion Principle (Clean Architecture): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- `PRD.md` Seção 3 (regra de dependência)

---

## ADR-006 — Parâmetros do algoritmo adaptativo e de segurança como configuração versionada

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** Pesos do `WeakKeyScore`, thresholds, critérios de mastery e parâmetros de segurança (custo do bcrypt, expiração do JWT) são hipóteses de design ou valores sensíveis, marcados "A VALIDAR" no PRD (Seção 26). Sem um mecanismo formal, tendem a ficar hardcoded e esquecidos no código.

**Decisão:** Parâmetros de produto/algoritmo vivem em `domain/config/adaptiveParams.ts`. Parâmetros de segurança que dependem de bibliotecas de infraestrutura (bcrypt, JWT) vivem em `infrastructure/auth/authParams.ts` — mas seguem a mesma disciplina: nunca inline na lógica, sempre nomeados e centralizados. Alteração em qualquer um desses arquivos é tratada com o mesmo cuidado de revisão de uma mudança de requisito.

**Justificativa:** Parâmetros de algoritmo e de segurança são hipóteses em validação ou valores sensíveis; espalhá-los no código inviabiliza rastreabilidade e auditoria de segurança, e o primeiro valor digitado tende a virar "verdade" silenciosa. Centralizá-los em arquivos de configuração versionados cria um único ponto de verdade revisável.

**Alternativas consideradas:** Constantes espalhadas nos próprios arquivos de algoritmo/auth — descartado por dificultar rastreabilidade e auditoria de segurança.

**Consequências:**

- (+) Um único ponto de verdade por domínio de parâmetro (produto vs. segurança).
- (+) Facilita auditoria de segurança (todos os parâmetros sensíveis em um arquivo, não espalhados).
- Regra "nenhuma constante de algoritmo adaptativo ou de segurança pode ser hardcoded" formalizada em `CONSTITUTION.md`, Seção 3.

**Referências:**

- Twelve-Factor App — Config: https://12factor.net/config
- `PRD.md` Seção 26 (parâmetros "A VALIDAR")

---

## ADR-007 — Conteúdo de reforço via porta INGramRepository

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O conteúdo de exercícios de reforço precisa usar padrões linguísticos reais de português brasileiro (N-grams), mas a origem concreta desses dados (arquivo estático, banco, corpus externo) é um detalhe de infraestrutura que pode evoluir.

**Decisão:** `domain/repositories/INGramRepository.ts` define o contrato `getPatterns(layout, targetKeys, minimumLength): Promise<string[]>`. A implementação inicial (`infrastructure/repositories/`) usa um corpus estático curado em arquivo; implementações futuras (banco de N-grams, serviço externo) substituem sem alterar `AdaptiveLessonEngine`.

**Justificativa:** A qualidade pedagógica do reforço depende de padrões linguísticos reais de pt-BR, mas a fonte concreta desses padrões é um detalhe trocável; isolar o contrato na porta evita acoplar `AdaptiveLessonEngine` a uma origem específica desde o início.

**Alternativas consideradas:** Gerar sequências de caracteres aleatórias sem base linguística — descartado por comprometer o valor pedagógico (PRD Seção 25, regra de "evitar sequências aleatórias sem valor pedagógico").

**Consequências:**

- (+) Fonte de conteúdo trocável sem tocar no motor adaptativo.
- (−) Qualidade do corpus inicial (curadoria manual) é um trabalho à parte, fora do escopo desta decisão técnica.

**Referências:**

- N-gram (Wikipedia): https://en.wikipedia.org/wiki/N-gram
- `PRD.md` Seção 25 (conteúdo de reforço)

---

## ADR-008 — Idempotência do submit de sessão

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** `POST /sessions/:id/submit` pode ser chamado mais de uma vez pelo mesmo cliente (retry HTTP, perda de conexão, duplo clique). Reprocessar métricas e atualizar `KeyPerformance`/`Progress` mais de uma vez corromperia os dados de desempenho do usuário.

**Decisão:** Ao processar um submit, o resultado (métricas calculadas + efeitos colaterais já aplicados) é registrado como parte do estado `COMPLETED` da sessão. Se o endpoint for chamado novamente para uma sessão já `COMPLETED`, o caso de uso detecta o estado e retorna o resultado previamente calculado, sem recalcular métricas, sem atualizar `KeyPerformance` novamente e sem incrementar `Progress` novamente (RN14).

**Justificativa:** Requests duplicados por retry são um comportamento esperado de clientes HTTP; sem idempotência, reprocessar métricas e aplicar efeitos colaterais uma segunda vez corromperia o histórico de desempenho do usuário (RN14).

**Alternativas consideradas:** Chave de idempotência (`Idempotency-Key` header) fornecida pelo cliente — descartado nesta fase por adicionar complexidade de protocolo não essencial, já que o próprio estado da sessão (`COMPLETED`) já serve como chave natural de idempotência para este caso específico.

**Consequências:**

- (+) Retry seguro por padrão, sem exigir nada do cliente.
- (−) Não cobre o caso de dois submits concorrentes chegando antes de o primeiro persistir o estado `COMPLETED` (condição de corrida) — mitigação (lock otimista/transação no repositório) é decisão de implementação da Fase 5, não deste ADR.

**Referências:**

- Idempotent Requests (Stripe): https://stripe.com/docs/api/idempotent_requests
- HTTP semantics (RFC 9110), métodos idempotentes: https://datatracker.ietf.org/doc/html/rfc9110
- `PRD.md` RN14

---

## ADR-009 — Regra de desempate no arredondamento dos pools de reforço

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O método do maior resto usado para distribuir os `N` caracteres de uma lição de reforço entre os pools `WEAK`/`CONSOLIDATING`/`MASTERED` (60/25/15%) pode gerar empate no resto fracionário (ex.: `N=150` gera empate exato entre `CONSOLIDATING` e `MASTERED`, ambos com resto `0,5`). Sem uma regra determinística, o resultado seria ambíguo e não testável de forma estável.

**Decisão:** Em caso de empate no maior resto, a unidade extra é atribuída seguindo a prioridade pedagógica `WEAK > CONSOLIDATING > MASTERED` — reforçar mais a tecla mais fraca é sempre preferível a reforçar mais uma tecla já dominada, quando o sistema precisa decidir entre duas opções igualmente válidas matematicamente (PRD RN19).

**Justificativa:** O método do maior resto produz empates determinísticos que precisam de desempate; uma regra nomeada e rastreável garante resultado estável e testável e, ao escolher a ordem pedagógica dos pools, reforça o mesmo princípio que motiva os pesos 60/25/15.

**Alternativas consideradas:** Ordem alfabética ou por ordem de definição no array — descartado por ser uma regra arbitrária sem relação com o objetivo pedagógico do produto, dificultando justificar o comportamento a um usuário ou revisor.

**Consequências:**

- (+) Resultado do arredondamento é 100% determinístico e testável.
- (+) A regra de desempate reforça o mesmo princípio pedagógico que já motiva os pesos 60/25/15.

**Referências:**

- Largest remainder method (Wikipedia): https://en.wikipedia.org/wiki/Largest_remainder_method
- `PRD.md` RN19

---

## ADR-010 — Parâmetros de segurança e métricas: valores validados

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Nota de atualização (Fase 3 entregue, TASK-034a–d):** o item 3 (`JWT_EXPIRATION = 24h`, interino) foi **substituído na prática** por `JWT_ACCESS_EXPIRATION = 15m` + `JWT_REFRESH_EXPIRATION = 30d` (access curto + refresh longo com rotação e revogação, endpoint `POST /auth/refresh`), como esta ADR já previa ao mover os refresh tokens para a Fase 3. O `authParams.ts` já reflete os novos valores e a Seção 26 do PRD foi atualizada no v1.4 (ver ADR-013 §13.4).

**Contexto:** O PRD (Seção 26) e o RNF06 deixavam em aberto cinco parâmetros sensíveis marcados "A VALIDAR": `BCRYPT_SALT_ROUNDS`, `JWT_EXPIRATION`, `MIN_PASSWORD_LENGTH` (em `infrastructure/auth/authParams.ts`), `ACTIVE_DURATION_EPSILON_MS` (em `domain/config/adaptiveParams.ts`), e o ambiente/ferramenta de benchmark do RNF06. A ausência de valores definidos impedia avançar para a Fase 5 (Infrastructure) com confiança, pois são decisões security-sensitive e de produto que impactam testes de integração e benchmarks.

**Decisão:**

1. `BCRYPT_SALT_ROUNDS = 12`.
2. `MIN_PASSWORD_LENGTH = 8` — sem exigência de complexidade (maiúscula/número/símbolo); permitir senhas longas (64+ caracteres) sem truncamento silencioso, com teste garantindo que o bcrypt não trunca em 72 bytes de forma que quebre a validação.
3. `JWT_EXPIRATION = 24h` (interino) — sem refresh token nesta etapa, acesso reautenticado diariamente; **refresh tokens movidos para a Fase 3** (access token curto 15–30 min + refresh token 30 dias com rotação, endpoint `/auth/refresh`).
4. `ACTIVE_DURATION_EPSILON_MS = 1000` — protege a divisão por zero em `ActiveDurationMinutes`; em conjunto, adicionada a **RN22**: sessões com `activeDurationMs < 3000` OU `charactersTyped < 5` não geram `SessionMetrics` válidas — retornam flag `insufficient-data` / métricas nulas.
5. RNF06 — Ferramenta: **`autocannon`** (lib Node/TS, instalável via `npm`, sem binário externo), integrada em script `npm run bench`. Ambiente: **local documentado** (CPU, RAM, OS da máquina de desenvolvimento) em vez de CI.

**Justificativa:**

1. Hardware moderno tornou 10 o mínimo aceitável; 12 oferece margem confortável (~250–350 ms/hash em hardware comum) sem degradação perceptível na experiência de login/registro. 14 traria ganho marginal de segurança com lentidão perceptível em cada request de auth.
2. Alinhado ao NIST SP 800-63B (2017): comprimento mínimo importa mais que regras de composição forçada, que historicamente geram senhas previsíveis (ex.: `Senha123!`).
3. Sem refresh token, o trade-off real (registrado no ADR-004) é: expiração curta = relogin constante; expiração longa = token roubado válido por muito tempo sem revogação. 24h é meio-termo razoável para projeto pessoal/portfólio — e o refresh token resolve o problema de raiz em vez de empurrar para TASK-067.
4. O epsilon sozinho não impede WPM absurdo em sessões muito curtas (ex.: 200 ms com 3 caracteres); a RN22 bloqueia métricas matematicamente corretas mas semanticamente sem sentido.
5. `autocannon` evita dependência de binário externo/Go; medir sempre no mesmo ambiente local dá baseline comparável ao longo do tempo, sem custo de configurar runner de CI para NFR não-bloqueante.

**Alternativas consideradas:**

- `BCRYPT_SALT_ROUNDS = 10` — descartado por ser o piso mínimo, sem margem para evolução de hardware.
- `BCRYPT_SALT_ROUNDS = 14` — descartado por latência perceptível em cada auth request sem ganho proporcional.
- Exigência de complexidade de senha — descartada por contradizer NIST 800-63B e gerar padrões previsíveis.
- `k6` para benchmark — descartado por exigir Go/binário externo, fora do stack Node/TS do projeto.
- CI como ambiente de referência — descartado por overhead de configuração sem benefício para baseline individual.

**Consequências:**

- (+) Todos os "A VALIDAR" da Seção 26 do PRD resolvidos; Fase 5 desbloqueada.
- (+) RN22 evita métricas enganosas em sessões triviais/acidentais, melhorando fidelidade do produto.
- (+) Refresh tokens na Fase 3 (não "fora de fase") elimina o trade-off insustentável do JWT stateless puro.
- (+) `autocannon` + ambiente local = benchmark executável em segundos, sem dependências externas.
- (−) `JWT_EXPIRATION = 24h` ainda exige relogin diário; aceito como limitação temporária até Fase 3 entregar refresh tokens.

**Referências:**

- NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
- OWASP Password Storage Cheat Sheet (factor de trabalho do bcrypt): https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- autocannon: https://github.com/mcollina/autocannon

---

## ADR-011 — Idioma do produto: pt-BR para conteúdo, inglês para identificadores de código

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O `PRD.md` (Seção 1.1) declara que o idioma oficial do produto é português do Brasil, refletindo que o único desenvolvedor e o público-alvo falam pt-BR. Sem escopo explícito, essa declaração é ambígua para uma IA implementando o código: "traduzir o produto" poderia ser lido como traduzir só o texto voltado ao usuário, ou também nomes de classes, variáveis, rotas e códigos de erro — decisões com consequências técnicas muito diferentes, e algumas partes do projeto (Fases 0–2 do `BACKLOG.md`) já foram implementadas antes desta ADR existir.

**Decisão:** Separar "idioma do produto" (o que o usuário final lê) de "idioma do código" (o que o desenvolvedor/IA lê):

- **pt-BR:** campo `message` de respostas de erro, mensagens de log destinadas a leitura humana, conteúdo de lições/exercícios, documentação de produto.
- **Inglês:** identificadores de código (classes, funções, variáveis, arquivos), rotas HTTP, campo `code` de erro, chaves estruturadas de log, mensagens de commit (Conventional Commits).
- Comentários de código em pt-BR são aceitáveis (estilo, não requisito) — não fazem parte desta decisão.
- O catálogo de códigos de erro e suas mensagens pt-BR canônicas fica centralizado no PRD (Seção 28.5), nunca inventado ad-hoc em um controller.

**Justificativa:** "Idioma do produto" e "idioma do código" têm consequências técnicas distintas; sem essa separação explícita, uma IA/desenvolvedor poderia traduzir identificadores e quebrar a compatibilidade com o ecossistema Node/TypeScript, ou manter mensagens de erro em inglês e violar a Seção 1.1 do PRD. É preciso uma definição inequívoca que cubra o que já foi implementado e o que vier.

**Alternativas consideradas:**

- Traduzir também identificadores de domínio (`TypingSession` → `SessaoDeDigitacao`, `KeyPerformance` → `DesempenhoTecla`) — descartada por dois motivos: (a) reduz a compatibilidade com convenções e tooling do ecossistema Node.js/TypeScript (linters, autocompletar de bibliotecas, exemplos de documentação), que assumem identificadores em inglês; (b) o único leitor do código-fonte é o próprio desenvolvedor e ferramentas de IA, para quem a barreira de idioma no código não é o problema real — o problema real é a experiência do usuário final do produto, que é resolvido pela tradução do conteúdo, não dos identificadores.
- Deixar a validação de entrada (Zod) com as mensagens padrão em inglês, documentando isso como "detalhe técnico aceitável" — descartada porque contradiz diretamente a Seção 1.1 do PRD: uma mensagem de erro de validação é texto lido pelo usuário final, então precisa do mesmo tratamento que qualquer outra mensagem de erro (ver PRD §28.5).

**Consequências:**

- (+) Escopo sem ambiguidade para qualquer IA/desenvolvedor implementando a partir de agora.
- (+) Catálogo único de mensagens de erro evita traduções inconsistentes espalhadas pelos controllers.
- (−) Exige trabalho de retrofit nas Fases 0–2 já implementadas antes desta ADR (mensagens de erro/log e schemas Zod potencialmente em inglês) — rastreado em `BACKLOG.md` TASK-069/070/071.

**Referências:**

- `PRD.md` Seção 1.1 e §28.5 (catálogo de erros)

---

## ADR-012 — Driver SQLite do TypeORM 1.x (better-sqlite3) e mitigação de concorrência de escrita

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O TypeORM 1.x instalado (v1.1.1) removeu o driver antigo baseado no pacote `sqlite3` (node-sqlite3) — a união de `DataSourceOptions` só oferece `better-sqlite3` e `sqljs` para SQLite, e a Fase 5 (TASK-049/050) precisa de repositórios TypeORM concretos. O pacote `sqlite3` declarado no ADR-002 ficou, portanto, sem uso e foi removido das dependências. Em paralelo, a TASK-054 exige mitigar (não ignorar) o risco de concorrência de escrita do SQLite sob o fluxo de submit.

**Decisão:**

- Driver **`better-sqlite3`** (síncrono, conexão única) no lugar de `sqlite3` — mesma base SQLite e mesmo ORM, sem mudança de API das interfaces de domínio.
- Entidades de persistência usando **`EntitySchema`** (sem decorators) — o tsconfig do projeto não habilita `experimentalDecorators`/`emitDecoratorMetadata`, e o `EntitySchema` é a forma canônica do TypeORM 1.x.
- Mitigações da TASK-054 centralizadas em `infrastructure/database/databaseParams.ts`:
  - `enableWAL = true` (journal WAL — escritores não bloqueiam leitores e reduz SQLITE_BUSY);
  - `timeout = BUSY_TIMEOUT_MS` (5000 ms — aguarda lock antes de disparar `SQLITE_BUSY`);
  - `PRAGMA foreign_keys = ON` via `prepareDatabase`;
  - único escritor síncrono por conexão (característica do próprio driver) elimina lock de escrita entre requisições concorrentes do mesmo processo.
- Datas persistidas como texto ISO-8601 (UTC, formato Z) e campos compostos (`targetKeys`, `keystrokes`, `metrics`) como texto JSON — sem dependência da conversão automática de `datetime` do driver, resultado determinístico para round-trip.
- A reconstrução de entidade de banco usa `TypingSession.reconstruct(props)` adicionada ao domínio (mesmo padrão de `KeyPerformance`), mantendo a porta `ITypingSessionRepository` intacta.

**Justificativa:** O driver declarado na ADR-002 deixou de ser suportado pelo TypeORM 1.x — permanecer nele não é uma opção viável; entre as alternativas do plugin, `better-sqlite3` é a única com persistência idiomática em arquivo e escritor síncrono único, que por si só elimina grande parte do risco de `SQLITE_BUSY` no processo — que é exatamente o que a TASK-054 pede para mitigar.

**Alternativas consideradas:**

- Permanecer no driver `sqlite3` — descartado: o TypeORM 1.x não o lista mais em `DataSourceOptions`.
- `sqljs` (sql.js, WASM) — descartado por exigir autosave manual e não expor file-persistence idiomática.
- Lock otimista por versão em `TypingSession` — adiado: fluxo de submit já é idempotente (RN14/ADR-008) e o uso é individual/local; reaparece se houver multi-escrita concorrente real (Fases futuras), sem mudança de contrato.

**Consequências:**

- (+) TASK-054 mitigada no nível de driver/PRAGMA — sem reescrever o domínio nem a API dos repositórios.
- (+) Trocar para PostgreSQL (ADR-005) continua sendo apenas nova implementação de repositório.
- (−) `better-sqlite3` é módulo nativo — requer `npm install` com toolchain de build disponível (prebuilds cobrem os LTS atuais).

**Referências:**

- SQLite WAL mode: https://www.sqlite.org/wal.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- TypeORM `EntitySchema`: https://typeorm.io/entity-schema

---

## ADR-013 — Avaliação de escopo de autenticação (TASK-067): OAuth, recuperação de senha e rate limiting

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O §13.4 do PRD lista refresh tokens, OAuth/login social, recuperação de senha por e-mail e rate limiting de tentativas de login como reconhecidamente necessários para produção, porém fora do escopo do Domain Core. Desde o registro original, o ADR-010 (item 3) moveu os **refresh tokens** para a Fase 3 (access token 15 min + refresh token 30 dias com rotação e revogação) e o item já está implementado (TASK-034a–d). A TASK-067 exige avaliar os três itens restantes e formalizar o desfecho de cada um.

**Decisão (avaliação item a item):**

1. **OAuth/login social — MANTIDO FORA DE ESCOPO desta versão.** Exige registro de aplicações OAuth nos provedores (Google/GitHub — credenciais `client_id`/`client_secret`, redirect URIs) e fluxo de callback no servidor, infraestrutura externa que o projeto não possui configurada hoje — mesmo motivo que mantém GitHub Actions fora do escopo atual. **Gatilho para reabrir:** haver usuários/consumidores reais fora do dono do projeto e infraestrutura de provedor disponível.
2. **Recuperação de senha por e-mail — MANTIDO FORA DE ESCOPO desta versão.** Exige provedor de e-mail transacional (SMTP/API), token de recuperação de uso único com expiração/rotação, endpoints e fluxo no cliente — nenhuma dessas infraestruturas existe. **Gatilho para reabrir:** usuários reais além do dono, ou provedor de e-mail configurado.
3. **Rate limiting das tentativas de login — APROVADO para implementação (TASK-073); único item autossuficiente da TASK-067.** Não depende de infraestrutura externa: limitador em memória por IP (janela fixa), aplicado a `/auth/login` e, por paridade ao mesmo risco de brute force, a `/auth/refresh`. Parâmetros centralizados em `infrastructure/auth/rateLimitParams.ts` (mesma disciplina do ADR-006, nunca hardcoded): `LOGIN_MAX_ATTEMPTS = 10`, `LOGIN_WINDOW_MS = 900000` (15 min), `REFRESH_MAX_ATTEMPTS = 30`, `REFRESH_WINDOW_MS = 900000` (15 min), todos por IP. Resposta além do limite: `429 TOO_MANY_REQUESTS` (nova entrada no catálogo §28.5 do PRD, mensagem pt-BR). O store em memória é suficiente para processo único (mesma lógica do ADR-012); a evolução para Redis mudaria apenas o store, sem mudança de contrato.

**Justificativa:** O rate limiting é o único item que depende exclusivamente do próprio serviço (endpoint + contador em memória), com custo-benefício imediato contra brute force; OAuth e recuperação de senha dependem de infraestruturas externas (registro de aplicação nos provedores; provedor de e-mail transacional) que não existem no projeto e cuja ausência os exclui de forma objetiva, não por preferência.

**Alternativas consideradas:**

- Rate limiting por e-mail além de por IP — adiado como segundo nível de defesa: diferenciar por e-mail responderia de forma distinta para contas existentes vs. inexistentes, facilitando enumeração de usuários; a janela por IP cobre a força bruta distribuída do mesmo endereço sem vazar informação.
- Limitador baseado em serviço externo (Redis/`@upstash/ratelimit`) — descartado por exigir infraestrutura fora do escopo atual (mesma razão da escolha do SQLite no ADR-002); registrado como evolução futura, não requisito da TASK-073.

**Consequências:**

- (+) Aprovação formal e rastreável do único item da TASK-067 com custo-benefício imediato, com parâmetros e código de erro especificados antes da implementação (spec-first).
- (+) OAuth e recuperação de senha permanecem com decisão de escopo registrada e gatilhos objetivos de reabertura.
- (+) §13.4 do PRD atualizado para refletir a realidade atual (refresh tokens já implementados; demais itens com status formal).
- (−) TASK-073 (implementação do rate limiting) entra como item "A fazer" no BACKLOG, consumindo tempo dedicado seguindo SDD (teste → implementação → catálogo §28.5 que já referencia).

**Referências:**

- OWASP Denial of Service Cheat Sheet (rate limiting): https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
- `PRD.md` §13.4 e §28.5

---

## ADR-014 — Avaliação da migração SQLite → PostgreSQL (TASK-068)

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O ADR-002 escolheu SQLite por simplicidade operacional; o ADR-005 blindou a troca de banco com portas de repositório; o ADR-012 mitigou a concorrência de escrita com `better-sqlite3` síncrono + WAL + `busy_timeout`. A TASK-068 pede avaliar se a migração a PostgreSQL já se justifica sob o critério "uso concorrente real".

**Decisão: PERMANECER em SQLite nesta versão.** Fundamentos:

1. **Uso atual é individual/local, single-process.** O driver `better-sqlite3` é síncrono com conexão única: um processo Node = um único escritor por vez, o que elimina `SQLITE_BUSY` entre requisições concorrentes do mesmo processo (ADR-012). O cenário que PostgreSQL resolve — muitos escritores simultâneos de processos/clientes diferentes — não existe no modelo de operação atual.
2. **O fluxo de submit é idempotente (RN14, ADR-008)** e o lock otimista já foi avaliado e postergado no ADR-012 pelo mesmo motivo.
3. **O custo da troca já está dimensionado e é baixo** (ADR-005): nova implementação de repositório + composição, sem tocar em `domain/` nem `application/`. Manter SQLite não cria passivo técnico relevante.

**Justificativa:** O critério acordado para migrar era "uso concorrente real"; hoje o modelo de operação é um único processo com um único escritor, o fluxo mais crítico (submit) é idempotente, e a troca futura está dimensionada como barata — portanto a migração adicionaria infraestrutura externa sem resolver nenhum problema atual ("migração por precaução").

**Gatilhos objetivos de migração (qualquer um deles dispara nova avaliação):** deploy público com usuários concorrentes reais; múltiplos processos/workers de escrita sobre o mesmo conjunto de dados; necessidade de alta disponibilidade, replicação ou infraestrutura gerenciada; features exigidas que SQLite não oferece (roles, schemas, extensões, backup online).

**Alternativas consideradas:** migração preventiva "por precaução" — descartada por custo de infraestrutura externa sem cenário de uso que a justifique (mesmo trade-off já registrado no ADR-002).

**Consequências:**

- (+) TASK-068 encerrada como avaliação formal; nenhuma mudança de código.
- (+) Decisões prévias (ADR-002/005/012) permanecem intactas e ganham gatilho de revisão explícito.
- (−) Se o produto evoluir para multiusuário, haverá trabalho de migração de dados versionada (CONSTITUTION §8) — mitigado pelo baixo custo garantido pelo ADR-005.

**Referências:**

- Appropriate Uses For SQLite (SQLite): https://www.sqlite.org/whentouse.html
- PostgreSQL: https://www.postgresql.org/docs/
- `PRD.md` RN14; `BACKLOG.md` TASK-068

---

## ADR-015 — Topologia da documentação de requisitos: SRD como container que referencia o PRD

**Data:** 2026-09-12
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A auditoria Sommerville (PRD v1.4) confirmou que o PRD já cobre ~90% do conteúdo de um SRD (requisitos de usuário §2.3, requisitos de sistema §27/§28, parágrafo de requisitos §2, restrições de projeto §13.3). Faltavam apenas modelos de sistema (Sommerville Cap. 8), especificação de interface explícita (§6.4) e assunções/dependências — mas a experiência do drift `JWT_EXPIRATION` mostrou que **qualquer duplicação de RN/RNF em dois arquivos gera divergência silenciosa**.

**Decisão:** Criar `SRD.md` como **container** (estrutura formal de SRD de Sommerville §6.2–6.4) que **não duplica** RNs, RNFs, parâmetros ou catálogo de erros — apenas os referencia por seção do PRD. O SRD agrega o que o PRD não tem: modelos de sistema em **Mermaid** (máquinas de estado de `TypingSession`/`KeyPerformance`, classDiagram do domínio, sequence de submit/refresh, contexto), tabela consolidada de rotas HTTP (§6, índice — não contrato) e assunções/dependências/requisitos inferidos (§7), espelhando fielmente o código implementado em `src/`.

**Justificativa:** Modelos que divergem do código têm valor negativo (documentam um sistema imaginário); mantê-los "ainda mais fiéis que o PRD" torna o SRD o repositório canônico da **forma implementada**, sem criar segundo dono para regras (o PRD continua a fonte única de RN/RNF). A rastreabilidade é marcada por tabelas RN → modelo → teste (SRD §9 A), e a precedência em divergência é: PRD > SRD.

**Alternativas consideradas:**

- SPR (Software Requirements Specification) único fusionado ao PRD — descartado: engordaria o PRD com diagramas/interface e misturaria "o quê/por quê" (PRD) com "forma implementada" (SRD), contrariando o §13 do CONSTITUTION.
- SRD com cópias das RNs "por completeza" — descartado: recriaria o volante de duplicação que produziu o drift JWT.

**Consequências:**

- (+) Mapa único navegável: requisito → modelo → teste (SRD §9 A).
- (+) Diagramas Fiéis ao código (identificadores em inglês, ADR-011), auditáveis por comparação direta com `src/`.
- (−) Requer disciplina: mudança de RN **primeiro** no PRD, depois reflexo nos modelos do SRD — política registrada em `CONSTITUTION.md` §12 e explicitada em `SRD.md` §8.
- (−) Um segundo arquivo de requisitos a revisar a cada mudança (mitigado pela regra "SRD nunca é fonte de regra").

**Referências:**

- `PRD.md` v1.4 (fonte única); `SRD.md` (container); `CONSTITUTION.md` §12

---

## ADR-016 — Migração de apresentação e stack web: Next.js (UI) + Nest.js (backend)

**Data:** 2026-09-14
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O cliente desktop (customtkinter/Python, removido em ADR-022) tinha latência percebida de **carregamento** (bootstrap lento), não por tecla — confirmado na medição e na triagem do código (bufferizava keystrokes e submetia em lote, então a latência não era round-trip por tecla). A RN06/RNF06 já define o objetivo de latência de submit. A medição mostrou que o gargalo era o bootstrap do cliente.

**Decisão:** Migrar a apresentação para **Next.js** (App Router, TS, consumindo o REST existente — o domínio/use cases permanecem no backend, a RN14 de idempotência continua valendo; o navegador **não reimplementa** regra de domínio). E, no backend, migrar **Express → Nest.js**, **reconciliando o ADR-002** (linha 56), que havia descartado o NestJS por "estrutura opinativa que compete com a Clean Architecture do PRD".

**Reconciliação com ADR-002/PRD §13.4:** O ADR-002 descartou NestJS pelo critério "clean architecture como objetivo de aprendizado ⇒ framework mínimo". Mudou o contexto: (a) a Clean Architecture já está **estabelecida e testada em `src/`** (Fases 0–7, `CONSTITUTION.md` §1) — o objetivo de aprendizado migrou do "esqueleto vazio" para "frameworks reais usados em produção"; (b) o `PRD §13.4` deixava a alternativa web **fora de escopo** — o usuário explicitamente inverteu isso. O Nest.js **preserva** o domínio intacto (controllers/serviços Nest ficam em `application`/`presentation`/`infrastructure`, injetados por módulos; `domain/` não importa Nest). O backend **não é reescrito do zero**: os use cases/entidades de `src/` são migrados (mover/adapter), não redesenhados.

**Alternativas consideradas:**

- Manter Express + apenas trocar a UI — descartado: o usuário decidiu trocar o backend também (Nest.js), e o ADR-002 não previa essa necessidade.
- Tauri/Electron (UI em janela nativa) — adiado: decisão de distribuição em aberto (§ item "distribuição"), não bloqueia Next.js (a mesma UI serve a ambos os empacotadores).
- React puro sem framework — descartado: perde SSR/SSG e o roteamento que aliviam a latência de carga (RNF06).

**Consequências:**

- (+) UI web com SSR/SSG ataca a latência de **carregamento** (RNF06) — não só a de tecla.
- (+) Next consumindo REST reutiliza 100% das RNs do domínio (RN14 idempotência, RN22 insufficient-data) sem duplicar nada no navegador.
- (−) Stack maior (dois apps TS + servidor); investimento em infra estrutura Nest (módulos) para migrar o Express — dimensionado no BACKLOG Fase 8, mitigado por: domínio/use cases intactos + ports `I*Repository`/`I*Service` (ADR-005) mantêm a troca como implementação de infraestrutura.
- (−) Distribuição **decidida em 2026-09-14 — Opção A (UI no navegador)**: o usuário abre o navegador e digita um endereço local; nada a instalar. B (Tauri) descartada nesta versão.

**Referências:**

- `PRD.md` §13.4 (alternativa web, antes fora de escopo — agora invertida); RN06/RNF06 (latência); RN14 (idempotência); RN22 (insufficient-data); `ADR.md` ADR-002 (contraditado), ADR-005 (ports); `CONSTITUTION.md` §1

---

## ADR-017 — POO formal e reuso de código na Fase 8 (migração web)

**Status:** Aceito · **Data:** 2026-09-14 · **Decisão:** **A manutenção das regras de domínio**

**Contexto:** A decisão ADR-016 estabeleceu Next.js (UI) + Nest.js (back-end) consumindo o REST de `src/`, garantindo que o navegador **não reimplementa** regra de domínio (RN14 idempotência, RN22 insufficient-data) — o domínio permanece no back-end, reutilizado via REST. O que permanece **implícito** (e este ADR torna **explícito, obrigatório e rastreável**) é a política de implementação: o projeto já é, de fato, **POO (Programação Orientada a Objetos)** — `src/application/use-cases/*.ts` são classes, `src/domain/entities`/`value-objects` são classes, e os ports `I*Repository`/`I*Service` (ADR-005) são contratos de classes que Clean Architecture injeta por dependência. Essa orientação a objetos precisa ser **política escrita** da Fase 8 — não uma preferência de estilo de um único desenvolvedor.

**Decisão:**

- **POO é obrigatório** em toda a Fase 8: UI web (Next.js — componentes de interface como camada de apresentação que consomem o REST), back-end (Nest.js — controllers/services como classes injetando os **mesmos** use cases/ports já POO de `src/`).
- **Reuso de código em vez de reescrita (DRY aplicado a camadas):** a migração **reutiliza** o domínio e os use cases existentes — move/adapta, **nunca reescreve** — respeitando ADR-016 (navegador não reimplementa RN), ADR-005 (ports) e a barreira de dependência do `CONSTITUTION.md`.
- O back-end Nest **injeta as mesmas classes** que o Express atual (mesmos use cases, mesmos ports, mesmas entidades) — a troca Express→Nest é uma troca de camada de infraestrutura/framework, **não** uma reimplementação do domínio (consistente com ADR-002 → ADR-016 reconcliliação).
- **Fora de escopo desta política:** reescrever regras de negócio no navegador (proibido — RN14/RN22 permanecem no back-end; ADR-016).

**Reconciliação:**

- **ADR-016** (migração wweb) — este ADR-017 é o **suplemento de implementação** de ADR-016: mesma decisão de distribuição (A — no navegador, consumindo REST), agora com a exigência explícita de POO/reuso. Sem alteração de RNs — RN14/RN22/RN16/RN17 continuam rastreáveis no `PRD`.
- **ADR-002** (Clean Architecture objetivo) — POO não conflita: DDD/POO (classes, encapsulamento, injeção de dependência) É o estilo que Clean Architecture já prescreve na casa desde `CONSTITUTION.md` §9 (Clean Architecture). Torna-se apenas explícito no ADR que rege a Fase 8.
- **RNF06 (latência)** — POO no navegador reutilizando REST mantém a medição 150ms/p95 (TASK-080) **no mesmo backend** — não há segunda implementação a medir.

**Referências:**

- `PRD.md` RN06/RNF06 (latência), RN14 (idempotência no back-end — permanece), RN22 (insufficient-data — permanece), RN25 (mastery — permanece), §13.4 (alternativa wweb); `ADR.md` ADR-002, ADR-005 (ports), ADR-016 (migração web); `CONSTITUTION.md` §1, §7, §9 (Clean Architecture); `BACKLOG.md` TASK-082 (rastreio) na Fase 8

---

## ADR-018 — MVC como protocolo da camada de apresentação (cliente web)

**Data:** 2026-09-15
**Responsável:** Dalmo Pereira
**Status:** Aceito · _Atualizado em ADR-022 (cliente desktop removido; protocolo vigora no único frontend web)_

**Contexto:** A arquitetura documentada cobre o backend (Clean Architecture, ADR-003) e a política de implementação da Fase 8 (POO + reuso, ADR-017), mas o padrão arquitetural da **camada de apresentação** nunca foi explicitado. O antigo cliente desktop (removido em ADR-022) implementava de fato a tríade MVC + camada de serviços (`models` espelhando os DTOs, `views`, `controllers`, `services` via api_client). O `SRD §1.2` tratava `desktop/` como "outro produto", e a Fase 8 (ADR-016) introduz um novo frontend **Next.js** sem padrão de apresentação definido — a forma de implementar a UI ficaria a cargo de cada agente/desenvolvedor.

**Decisão:** Adotar **MVC como protocolo obrigatório da camada de apresentação do OpenType Tutor** — em linha com o que o cliente desktop já implementava e que a UI web agora segue como único frontend:

- **Model** — representações de dados da UI (DTOs), espelho dos contratos REST, sem entidades de domínio. No Next.js: tipos TS e estado do cliente (`web/models/`).
- **View** — renderização e captura de eventos de UI. No Next.js: páginas e componentes React (`web/app/`).
- **Controller** — orquestração de eventos de UI, validação de apresentação e coordenação com os serviços de API; **nunca contém regra de negócio de domínio**. No Next.js: `web/controllers/` consumindo os serviços REST.
- **Services (camada auxiliar de transporte)** — comunicação HTTP com o backend REST e mapeamento de erros; isolam os controllers de detalhes de transporte (`web/lib/api-client.ts`).

Regras de dependência da apresentação:

1. **View → Controller → Services → REST**: a View não fala com Model/Services diretamente; toda interação passa pelo Controller.
2. **Nenhuma RN é reimplementada na apresentação** — RN14 (idempotência), RN22 (insufficient-data), RN16/RN17 (auth/posse) permanecem no backend, consumidas via REST (ADR-016/017).
3. **Modelos da UI são DTOs**, nunca entidades de domínio — o domínio continua no backend (ADR-003/005).

**Justificativa:** MVC é o padrão canônico de aplicações com interface (GUI e web page-driven), isola renderização de estado e de transporte — a estrutura que o cliente web deve adotar. Registrá-lo elimina a divergência código↔documento e dá à Fase 8 um padrão explícito: a UI Next não fica "livre" para reimplementar regras ou misturar transporte com renderização. É complementar, não substituto, à Clean Architecture do backend: o padrão se aplica **dentro** da camada de apresentação.

**Alternativas consideradas:**

- Manter implícito como está — descartado: a Fase 8 cria o frontend web sem padrão definido, e a revisão de código não teria base formal para exigir separação View/Controller.
- MVVM/Bloc/Redux como padrão da Fase 8 — adiado/rejeitado: acrescenta infraestrutura de estado reativo desnecessária para um cliente consumidor de REST; se o estado do cliente ganhar complexidade distribuída, avalia-se adicionar camada de estado sem substituir o MVC.
- MVP (Presentador) — rejeitado: fora do escopo de um cliente consumidor de REST; o MVC é suficiente e alinhado ao ADR-017 (POO).

**Consequências:**

- (+) Documentação da apresentação alinhada ao código atual do cliente web (o padrão já está aplicado em `web/controllers/` + `web/models/` + `web/app/`).
- (+) Fase 8 passa a ter contrato de implementação para View/Controller/Services no Next.js (rastreado em TASK-083).
- (+) Revisão (ADR/CODE REVIEW) passa a checar a regra "Views→Controllers→Services; sem RN na apresentação" no cliente web.
- (−) O termo "protocolo MVC" deve ser usado de forma consistente no cliente web; exige disciplina para não deixar a UI Next evoluir para código monolítico em componentes.

**Referências:**

- `ADR.md` ADR-016 (migração web), ADR-017 (POO/reuso), ADR-022 (remoção do cliente desktop), ADR-003/005 (Clean Architecture — backend permanece); `SRD.md` §1.2/§3; `BACKLOG.md` TASK-083; `PRD.md` RN14, RN16/RN17, RN22

---

## ADR-019 — Pacing de prática: bloco de 15 min de prática ativa → pausa mínima de 3 min (RN33)

**Data:** 2026-09-17
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O PRD já trata saúde como regra de domínio (RN24 check-in ergonômico, RN28 regra de segurança por desconforto, RN30 lembrete de pausa no fechamento), mas a prática de digitação não é **pausada por tempo**: o usuário pode encadear lições indefinidamente, e a orientação "pausas a cada 30–60 min" é apenas texto. O feedback de produto pede um pacing mensurável: a cada 15 minutos de prática ativa, uma pausa mínima de 3 minutos (alongar os braços, beber água, ativar a circulação) antes de iniciar a próxima lição — com foco em condicionamento físico e concentração. **Requisito decidido em conjunto:** a lição em curso nunca é interrompida; se o bloco de 15 min estourar no meio de uma lição, ela conclui normalmente e a pausa vale a partir da conclusão.

**Decisão:** Introduzir a **RN33** (PRD §27), implementada como política de domínio no backend e consumida via REST pelo cliente web (único frontend — ADR-022):

- **Domínio:** nova entidade `PracticePacingState` (por `userId`): `accumulatedActiveMs` (desde o início do bloco) e `lastSessionEndedAt` (fim da última sessão completada). Lógica pura: `recordCompletedSession`, `isBreakRequired(now)`, `breakRemainingMs(now)`, `startNewBlock(now)` — todo relógio injetado (testável sem espera real).
- **Parâmetros:** `PRACTICE_BLOCK_DURATION_MS = 900000` e `MIN_BREAK_DURATION_MS = 180000` centralizados em `domain/config/adaptiveParams.ts` (ADR-006 — nunca literais inline).
- **Porta:** `IPracticePacingRepository` (ADR-005) com `findByUserId`/`save`; implementações `InMemory` (testes) e `TypeORM` (SQLite, `practice_pacing`), isoladas por `userId` (RN17).
- **Enforcement no ciclo de sessão:** `StartTypingSession` recusa **criar** uma sessão quando o bloco está estourado e a pausa não completou — `BreakRequiredError` → `BREAK_REQUIRED` (409, catálogo §28.5); `SubmitTypingSession` acumula a prática ativa da sessão recém-concluída (apenas na primeira conclusão — RN14 idempotência preservada; sessões `ABANDONED` não acumulam — RN13). Nenhum estado de sessão em curso é alterado pela política.
- **Consulta para a UI:** `GetPracticeStatus` em `GET /me/practice-status` devolve `{ accumulatedActiveMs, practiceBlockMs, minBreakMs, breakRequired, breakRemainingMs }` — os clientes **não** reimplementam a regra nem hardcodam os limites; apenas cronometram a pausa restante (ADR-018: nenhuma RN na apresentação).
- **Bloco novo após pausa:** ao iniciar uma sessão permitida com `accumulatedActiveMs ≥ bloco` (pausa já cumprida), o acumulador zera — nova sequência 15:3. Contagem por dia calendário local, reiniciada automaticamente (o acumulador vive no estado persistido e é comparado ao relógio).

**Justificativa:** micro-pausas curtas reduzem fadiga e desconforto musculoesquelético e o leve descanso favorece a retomada da atenção — alinha-se à metodologia ergonômica já assumida (NR17, RN24/RN28). Colocar a regra no domínio (e não no cliente) permite reuso pelo cliente via REST, teste determinístico (TDD) e rastreabilidade — a UI apenas reflete o estado; a decisão de health/pacing permanece no backend, coerente com ADR-018 (nenhuma RN na apresentação).

**Alternativas consideradas:**

- Timer só no cliente — descartado: política fora do domínio sem rastreio nem teste, divergência silenciosa e viola o espírito do ADR-018.
- Backend apenas valida, clientes cronometram o 15 min — o requisito em discussão foi a favor do backend mandar o acumulado e o tempo restante, mantendo os clientes simples e consistentes.
- Interromper a lição ao estourar o bloco ("Dentro da lição") — descartado: o requisito decide que a lição em curso sempre conclui; interromper geraria sessão incompleta e adicionaria transições de estado desnecessárias (`TypingSession` só pausa por ação do usuário).

**Consequências:**

- (+) RN33 rastreável e testável (domain + use case + endpoint); clientes simples (só mostram estado/countdown).
- (+) `StartTypingSession` e `SubmitTypingSession` ganham um dependência (`IPracticePacingRepository` + relógio injetável) — todos os pontos de composição e testes precisam ser atualizados.
- (−) Sessões longas (>15 min ativos) não geram pausa intermediária por decisão de requisito; o break só vale entre lições.
- (−) Nova tabela `practice_pacing` e migração; estado por usuário adicional para persistir.
- (0) RNF06 não é afetado: o caminho `submit` ganha apenas uma WRITE extra (~µs) no SQLite; o budget de 150ms (p95) não é tensionado por RN33 — sem necessidade de redesenhar o bench.

**Referências:**

- `PRD.md` RN33 (§27), §26 (params), §28.5 (`BREAK_REQUIRED`); `CONSTITUTION.md` §5 (SDD); `ADR.md` ADR-006 (params), ADR-005 (ports), ADR-018 (sem RN na apresentação); `BACKLOG.md` TASK-089+ (fase de implementação)

---

## ADR-020 — Dashboard do progresso: agregação pré-computada no backend + Recharts no cliente (RN34–RN37, RNF11)

**Data:** 2026-09-18
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A Fase 9 adiciona ao painel `Dashboard` três rotas `GET /me/dashboard/*` consumindo: (a) série diária de evolução (PPM, precisão, latência) em janelas 7/30/90 dias (RN35), (b) mapa de calor de teclas em 7 dias (RN34), (c) proximidade de cada tecla à maestria via `MasteryProximityIndex` (RN36) e (d) transições de mastery ao longo do tempo. Duas decisões emergem: **como agregar** os dados de sessão sem estourar performance com 1 ano de histórico (RNF11: `p95 ≤ 500ms` para 52 semanas por usuário) e **qual biblioteca** desenhar os gráficos no cliente web.

**Decisão:**

1. **Agregação pré-computada no backend.** Nova entidade de domínio `DailyMetricsAggregate` (por `userId + layout + date` local) persistida em tabela própria (`daily_metrics_aggregate`), mantida no caminho do `SubmitTypingSession` (upsert idempotente — RN14 não duplica no re-submit; sessões `ABANDONED`/`insufficient-data` não entram — RN13/RN22). O agregado guarda **contadores somáveis** (`sessionsCompleted`, `totalActiveMs`, `totalGrossChars`, `totalCorrectChars`, `totalErrors`, `totalLatencyMs`, `totalLatencySamples`, `keysPracticed` únicos do dia) — as métricas do dia (netWpm, precisão, latência média) são **derivadas** dos contadores na leitura. O dashboard **nunca varre sessões por request**: lê `SUM/COUNT` dos agregados por janela → satura RNF11. `UserProfile.timezone` (IANA, default `America/Sao_Paulo`) define o "dia" local de cada agregado (RN37).
2. **Log de transições de mastery `KeyMasteryTransition`.** Upendada no `KeyPerformance.recordSessionEnd` **somente quando** o `masteryState` muda (`{userId, logicalKey, layout, date, from, to}`) — raro por natureza; alimenta a linha do tempo de mastery sem varrer sessões.
3. **Gráficos no cliente com Recharts.** Biblioteca React declarativa, leve (sem dependência Canvas/Babylon), com acessibilidade e responsividade adequadas ao Next.js já adotado (ADR-016). Os 8 widgets do `/app/dashboard` (cards KPI, 3 linhas de evolução, teclado heatmap, lista de proximidade, timeline de transições, distribuição de estados) apenas **renderizam** os DTOs pré-agregados — nenhuma RN no cliente (ADR-018); cores sempre acompanhadas de rótulos (acessibilidade, RN36 faixas).
4. **Pesos do `MasteryProximityIndex` (RN36):** `w_accuracy=0.35`, `w_latency=0.25`, `w_streak=0.25`, `w_attempts=0.15` — recomendados e validados pela rodada do Bloco 0.5 (precedente RN04: correção domina, velocidade em 2º, volume/gate em último; literatura de mastery learning: volume é gate, não sinal de proficiência). Sempre em `adaptiveParams.ts` (`MPI_*`, §26) — nunca inline (ADR-006).

**Justificativa:**

- **Performance:** agregação por request (filtrar 10⁴–10⁵ sessões, somar e derivar métricas) não atende `p95 ≤ 500ms` em SQLite de arquivo com 1 ano de dados; pré-computar converte a leitura do dashboard em poucas linhas de agregados (52 semanais → 365 diárias/ano).
- **RNF06 preservado:** o `submit` ganha 1 WRITE (upsert) por primeira conclusão — mesma magnitude de RN33/ADR-019; o orçamento de 150ms não é tensionado.
- **Testabilidade TDD:** o agregado é domínio puro (somas/derivações, relógio e timezone injetáveis) — consistente com ADR-003/005.
- **Recharts:** padrão de mercado para séries temporais em React, sem lock-in de fornecedor e sem camada canvas/mobile extra; independence da stack Next já assumida (ADR-016), reduzindo superfície de dependência em relação a alternativas (Chart.js, D3 raw, Nivo).

**Alternativas consideradas:**

- **Agregação sob demanda por request** (SQL `GROUP BY` sobre sessões na hora) — descartada: varredura O(histórico) por view por janela, custo cresce com o tempo, não atinge RNF11 no pior caso de 1 ano.
- **Agregação em memória/cache** (LRU por usuário, invalidação no submit) — descartada: materialização simples + determinística no store é mais simples de manter, testar e re-gerar (reset de progresso RN31) do que invalidação de cache; RNF11 medida sem cache externo (mesmo espírito do RNF06).
- **Chart.js / D3 / Nivo** — Chart.js: canvas, menos tipada no ecossistema TSR; D3 raw: verboso para 8 widgets; Nivo: camada sobre D3 com mais indireção. Recharts: SVG + declarativo, JSX-aligned com o codebase.
- **Cliente desktop com gráficos** — irrelevante após a descontinuação do desktop (ADR-022); o painel é exclusivamente web-first (ADR-016).

**Consequências:**

- (+) RNF11 rastreável e verificável (`bench:dashboard`, seed 52 semanas); RNF06 revalidado (submit +1 WRITE upsert).
- (+) Dashboard determinístico e pré-decidível; reset de progresso (RN31) deve limpar também os agregados e o log de transições (estendido no TASK-097).
- (−) Duas tabelas novas (`daily_metrics_aggregate`, `key_mastery_transition`) + campo `timezone` em `user_profile` e migração.
- (−) `SubmitTypingSession` e `KeyPerformance.recordSessionEnd` ganham dependências novas (portas `IDailyMetricsAggregateRepository`/`IKeyMasteryTransitionRepository`) — pontos de composição e testes atualizados.
- (0) Nenhuma RN no cliente (ADR-018); o web apenas renderiza DTOs pré-agregados.

**Referências:**

- `PRD.md` RN34–RN37 (§27), §26 (params `MPI_*`/`DASHBOARD_*`), §28.1 (RNF11), §28.4 (conflito RNF06×RNF11), §29, §30 (FASE 9); `CONSTITUTION.md` §5 (SDD); `ADR.md` ADR-006 (params), ADR-005 (ports), ADR-016 (Next), ADR-018 (sem RN na apresentação), ADR-019 (padrão de WRITE extra no submit); `BACKLOG.md` TASK-092–102 (Fase 9 concluída)

---

## ADR-021 — Temas claro/escuro na UI web: tokens de design via CSS custom properties (Light/Dark Mode)

**Data:** 2026-09-21
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A UI web (Fase 8, ADR-016/ADR-018) cresceu com identidade visual inconsistente: a Landing Page (TASK-103) foi entregue em **tema escuro** (canvas `#010102` — identidade do DESIGN.md), enquanto a área do aluno (dashboard, lições, progresso, autenticação) usa o **tema claro padrão** do Tailwind (`slate-*`, `bg-white`). Além da inconsistência, o usuário requisitou **suporte real a Light e Dark Mode** em toda a aplicação — as duas variações do mesmo sistema visual, com controle de alternância visível, preferência persistida e tokens de design (não um botão de modo escuro ad hoc). Até aqui, a spec proibia light mode ("Nunca: light mode" — UI-UX-SRD §8; "Don't ship a light-mode" — DESIGN.md).

**Decisão:**

1. **Tokens semânticos vivos (CSS custom properties).** Os tokens do `@theme` (`--color-canvas`, `--color-surface-1..4`, `--color-hairline(-strong)`, `--color-ink(-muted/-subtle/-tertiary)`, `--color-primary(-hover/-focus)`, `--color-success`) passam a referenciar variáveis de runtime (`var(--ott-*)`) redefinidas em `:root` (default **dark**, identidade do produto) e em `[data-theme="light"]`. Tailwind v4 `@theme inline` faz os utilities resolverem a variável no runtime ⇒ os componentes **respondem ao tema ativo** sem lógica própria.
2. **Toggle no cabeçalho + persistência.** `ThemeToggle` no `AppNav` (área do aluno) e na top-nav da Landing alterna `data-theme` no `<html>` e persiste em `localStorage('ott-theme')`. Um **script inline anti-FOUC** no `<head>` de `app/layout.tsx` aplica o tema salvo antes da hidratação (sem `next-themes`: implementação própria leve, sem dependência nova).
3. **Paleta clara própria (não-inversão).** O tema claro deriva do **mesmo sistema**: mesma hierarquia (dark) de surfaces/hairline/ink, porém com valores claros calculados para contraste AA; **primary (`#5e6ad2`) idêntico nos dois temas** — a identidade lavender é preservada. Erros/sucesso/gamificação usam tokens semânticos de chip (`chip-neutral/warning/info/success/danger/sky`) com valores por tema.
4. **Gráficos e teclados virtuais orientados ao tema.** Recharts (grid/axis/comparação) e os teclados/heatmap (que misturam hex em JS) consomem uma paleta por tema via hook `useTheme()` (`web/lib/theme.ts` + provider) — nenhum hex hardcoded em estilo derivado de superfície.
5. **Acessibilidade mantida (RN32/RN36):** cor nunca sozinha (rótulo/ícone sempre junto), contraste AA em ambos os temas, foco visível por `primary-focus`. Nenhuma RN no cliente (ADR-018).

**Justificativa:**

- Uma única fonte de tokens (CSS vars em `globals.css`) cobre toda a aplicação (landing, auth, dashboard, lições, prática, conclusão, progresso, perfil, modais, estados) sem transformar o layout em duas UIs distintas — as duas variações do mesmo produto.
- Implementação própria (sem `next-themes`) mantém a stack enxuta e o comportamento determinístico e testável; o script inline resolve o FOUC sem camada JS adicional.

**Alternativas consideradas:**

- **Manter tema único** (dark em tudo) — descartado: o usuário requisitou explicitamente suporte real a Light e Dark como variações formais do mesmo sistema.
- **`next-themes`/biblioteca de theming** — descartado: ganho marginal de DX para uma dependência a mais; o padrão `data-theme` + CSS vars é pequeno e suficiente (mesmo espírito do ADR-002: framework mínimo no essencial).
- **Tema claro exclusivo na área do aluno e escuro na landing** — descartado: era o estado atual, inconsistente e contrário à identidade do DESIGN.md; os dois temas valem para as duas áreas.

**Consequências:**

- (+) UI consistente e identidade preservada nos dois temas; preferência persistida entre acessos; acessibilidade AA preservada.
- (−) Migração mecânica de ~20 componentes de `web/` (troca de utilities `slate-*`/`bg-white` por tokens); risco de regressão visual precisa de revisão manual.
- (−) Charts/teclados/heatmap precisam ler a paleta do tema ativo (hook), aumentando levemente a superfície dos componentes de rendering.
- (0) Nenhuma RN/RNF alterada; nenhuma dependência nova.

**Referências:**

- `PRD.md` RN32/RN36 (§27), RNF09 (§28.1); `CONSTITUTION.md` §4 (arquitetura), §5 (SDD); `ADR.md` ADR-002 (stack mínima), ADR-016 (Next), ADR-018 (sem RN na apresentação), ADR-020 (dashboard web); `UI-UX-SRD.md` §8/§15/§16 (a alterar por este ADR); `DESIGN.md` (identidade — tokens, paletas, "Don'ts"); `BACKLOG.md` TASK-104

---

## ADR-022 — Descontinuação do cliente desktop: web como único frontend

**Data:** 2026-09-21
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A Fase 8 (ADR-016) migrou a apresentação para a web (Next.js) e a Fase 9 (ADR-020/021) entregou no web toda a superfície do produto: dashboard (RN34–RN37), prática com dead key (RN38–RN40), perfil com ABNT2/US e fuso (TASK-104/105/106), temas claro/escuro (ADR-021) e pacing de prática (ADR-019). O cliente antigo (Python/customtkinter, `desktop/`) não recebia novas funcionalidades desde a migração e impunha custo de manutenção duplo — dois UIs para validar, divergências de serialização (TASK-081/084) e a superfície de "paridade" que só existia por causa dele.

**Decisão:**

1. **Remover o cliente antigo definitivamente**: pasta `desktop/` (Python/customtkinter), `Prompt-Tkinter-Agent-v2.md` (spec morta do agente) e os resquícios Python do repositório (`.gitignore`, `.pytest_cache`). A **UI web (Next.js) passa a ser o único frontend** do produto.
2. **Paridade de serialização extinta com ele**: o `ParityWebDesktop.test.ts` (TASK-081/084) perdeu o segundo ator; as regressões de composição web que ele protegia são preservadas em `SubmitTypingSessionCompose.test.ts` (compose correto ≠ infla precisão; compose errado = INCORRECT; `DEAD_KEY_COMPOSE`/`CORRECTION` fora da latência média).
3. **Especificações atualizadas**: PRD/SRD/AGENTS/UI-UX-SRD/BACKLOG reescritas para o cliente web único (protocolo MVC — ADR-018 — vigora no web). Nenhuma RN/RNF do PRD é alterada — as regras de domínio não dependiam de cliente.
4. **Este ADR supera** as partes dos ADRs 016/017/018/019/020 que tratavam de "dois clientes" ou descreviam o cliente antigo como componente ativo; seus registros históricos permanecem como contexto da época.

**Justificativa:** um único frontend elimina a duplicação de manutenção, QA e divergência de serialização, mantendo o domínio (backend Clean Architecture, ADR-003/005) e o protocolo MVC (ADR-018) intactos. A web cobre 100% das funcionalidades que o antigo cliente entregava (RNF06/RNF11 medidos na Fase 8/9).

**Alternativas consideradas:**

- Manter o cliente antigo em manutenção mínima — descartado: sem novas features desde a migração e com borda de divergência de serialização (TASK-081/084), o custo de manter dois UIs supera o benefício; o usuário optou por produto web-first (ADR-016, Opção A).
- Empaquetar o Next.js com Tauri (manter "app desktop") — descartado na decisão de distribuição (ADR-016 — Opção A: navegador; nenhuma instalação).

**Consequências:**

- (+) Repositório mais enxuto (−322 MB `desktop/`); um único frontend para validar, revisar e medir.
- (+) Fim da superfície de paridade de serialização; regressões de compose preservadas em `SubmitTypingSessionCompose.test.ts`.
- (−) Documento histórico (ADR-016/017/018 histórico) mantém referências ao cliente antigo como registro da época (ver nota de atualização no ADR-018).
- (−) Usuários que dependiam do binário do cliente antigo precisam usar o navegador — escopo já decidido (ADR-016 Opção A).

**Referências:**

- `ADR.md` ADR-016 (migração web + distribuição Opção A), ADR-017 (POO/reuso), ADR-018 (MVC na apresentação — atualizado por este ADR), ADR-019/020/021 (features web-first); `PRD.md` §27, §28.1 (RN e RNFs inalteradas); `BACKLOG.md` TASK-107; `SRD.md` §1.2/§3; `AGENTS.md` (seção apresentação)

---

## ADR-023 — Clean Code e TDD por tier de risco, com gate automatizado

**Data:** 2026-09-26
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** Os artefatos do projeto declaram Clean Architecture, DDD e SOLID (`PRD.md` §8, `CONSTITUTION.md` §1–2, ADR-003/005/017) e MVC na apresentação (ADR-018) — mas **Clean Code nunca foi nomeado**, e o escopo de TDD é hoje deliberadamente parcial (`CONSTITUTION.md` §6: obrigatório em `domain/`, "recomendado" em `application/`, "não é exigido" em `presentation/`). A medição de baseline em 2026-09-26 mostrou três lacunas concretas:

- **O gate não cobre estilo.** O `eslint.config.mjs` tem 148 regras ativas, todas de type-safety (`strictTypeChecked`), e **zero** regras de complexidade ou tamanho (`complexity`, `max-lines`, `max-lines-per-function`, `max-depth`, `max-params`, `no-magic-numbers`). A ativação ingênua desses limites, com as opções padrão do ESLint, produziria 758 violações — 137 em produção e 621 em testes, quase todas `no-magic-numbers`. Com as exceções que a §2.1 e a §3 justificam (`enforceConst`, `ignoreDefaultValues` e as regras de tamanho desligadas em `*.test.ts`), a primeira medição deu **115 violações** — 112 em produção e 3 em testes. **49 delas eram falso-positivo da própria configuração** (ver "Retificação"): a dívida real é **66** — `no-magic-numbers` 31, `max-params` 11, `max-lines-per-function` 10, `complexity` 9, `max-lines` 2, mais 3 `complexity` em testes. Por camada: `domain` 27, `application` 16, `presentation` 14, composition roots 4, `infrastructure` 2, `shared` 0.
- **A cobertura só é gateada no domínio.** `vitest.config.ts` restringe `coverage.include` a `src/domain/**`, então o gate de 90% nunca enxerga o resto. Cobertura real por camada: `domain` 94,74% stmts / 95,15% funcs / 90,74% branch; `application` 85,85 / 82,18 / 76,95; `infrastructure` 88,57 / 86,56 / 78,48; `presentation` 80,08 / 73,47 / 61,60; `shared` 88,89 / 100 / 75.
- **A lacuna de teste não é aleatória — é código órfão.** Seis use cases e três repositórios estão com **0%** de cobertura, e são exatamente o subconjunto que só existe na stack Express morta (os scripts `dev`/`start` passaram a apontar para o Nest em ADR-017): `GetAdminSettings`, `UpdateAdminSettings`, `RequestPasswordReset`, `ConfirmPasswordReset`, `AdminResetUserPassword`, `GetLessonPacingStatus`, `TypeOrmAdminSettingsRepository`, `TypeOrmPasswordResetTokenRepository`, `TypeOrmPracticePacingRepository`. Nenhum é alcançável pela UI web. A regra que faltava não era "mais cobertura", era "código sem rota e sem dono não entra".

**Decisão:**

1. **Clean Code entra como princípio nomeado na `CONSTITUTION.md` §2**, com a mesma lógica de enforcement da §1: o que é automatizável vira regra de lint, o que é humano vira revisão. Limites: `complexity ≤ 10`, `max-lines ≤ 300`, `max-lines-per-function ≤ 50`, `max-depth ≤ 4`, `max-params ≤ 4`, `no-magic-numbers` (ignora `0, 1, -1, 2, 100` e índices). Exceção: `max-lines` não se aplica a migrações, seeds e corpus (dados, não lógica).
2. **TDD e cobertura passam a ser exigidos por tier de risco, não uniformemente.** Tier = camada, e o tier é justificado pela natureza do código, não por conveniência:

   | Tier                                              | Camada                                                 | TDD                                                                     | Cobertura mínima (stmts/funcs/branch)  | Clean Code (hoje → alvo) |
   | ------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------- | ------------------------ |
   | **1 — regra de negócio e contrato compartilhado** | `domain/`, `shared/`                                   | Obrigatório (Red→Green→Refactor)                                        | `domain` 90/90/90 · `shared` 85/100/70 | `warn` → `error`         |
   | **2 — orquestração**                              | `application/`                                         | **Obrigatório** (era só recomendado)                                    | 80/80/75                               | `warn` → `error`         |
   | **3 — adaptador com estado**                      | `infrastructure/repositories/`                         | Obrigatório                                                             | 75/75/75 (glob `infrastructure`)       | `warn` → `error`         |
   | **4 — adaptador técnico**                         | `infrastructure/` (auth, logger, rate limit, database) | Teste onde há decisão, não só integração mecânica                       | 75/75/75 (mesmo glob)                  | `warn` → `error`         |
   | **5 — adaptador HTTP**                            | `presentation/`                                        | **Por exceção** (só fluxo crítico: auth, submit, acesso não autorizado) | 70/70/60                               | `warn` → `error`         |

   O tier 5 mantém o escopo que a §6 já prescrevia, e por isso é o único que não rende TDD universal — ver "Alternativas".

3. **Todas as regras Clean Code entram em `warn` nesta fase, em todos os tiers, e viram `error` quando a dívida de 66 violações (63 de produção + 3 de teste) for zerada.** O `warn` torna a dívida visível e mensurável sem derrubar o build — ativar `error` já nos tiers 1-2 no mesmo dia da decisão geraria 43 erros e quebraria `npm run lint` e o CI. A severidade-alvo por tier fica declarada em `CLEAN_CODE_SEVERITY`, no topo do `eslint.config.mjs`, para que o flip seja mecânico. Em `*.test.ts` ficam desligadas `no-magic-numbers`, `max-lines` e `max-lines-per-function` (fixture numérica e tabela de casos são dados, não lógica); `complexity` e `max-params` continuam valendo.
4. **Os composition roots (`src/composition-root.ts`, `src/main-nest.ts`) são excluídos do threshold de cobertura** — são wiring de bootstrap, exercitados pelo e2e (`src/e2e/fullFlow.test.ts`), não por unidade. Sem essa exclusão os 0% deles (73 stmts) puxariam o agregado para baixo sem sinal de qualidade.
5. **Código órfão não é teste, é remoção.** Os 6 use cases e 3 repositórios do item 3 do contexto só recebem TDD se ganharem rota no Nest; até lá, ficam registrados como dívida com dono. A remoção em si é objeto de um cleanup à parte (a stack Express e esses use cases são código morto desde ADR-017), **fora do escopo deste ADR**.
6. **A `CONSTITUTION.md` §2 passa a mapear cada um dos 5 princípios SOLID para o artefato que o comprova** (não para prosa), na mesma linha da §1: ISP → 13 interfaces de repositório de 2–7 métodos; LSP → 6 interfaces com duas implementações (`TypeOrm*` + `InMemory*`); DIP → regra de lint; SRP → `authMiddleware` resolve identidade, use case resolve posse; OCP → `domain/value-objects/Layout.ts` é o ponto de toque ao adicionar layout.
7. **O tier é reavaliado por review, não por data.** Reclassificar a camada de um tier é decisão de constitution e exige novo ADR, pelo mesmo mecanismo da §12.
8. **O gate só pode medir o que ele entende.** Três exceções de calibração, todas com motivo verificável, corrigem 49 falso-positivo da primeira medição:
   - **Códigos HTTP não são magic numbers.** São constantes nomeadas pela RFC 9110, e `no-magic-numbers` não tem consciência de protocolo. `HTTP_STATUS_CODES` entra no `ignore` — removes 43 violações, 37% do total medido. Isto é decisão de **medição**, não de qualidade: `DomainError.statusCode` continuar sendo código HTTP dentro de `src/domain/` é vazamento de arquitetura e segue aberto como dívida no item 10. O que o gate deixa de exigir é a renomeação cosmética `HTTP_409`, que só enterrava o problema.
   - **`src/domain/config/**` fica isento de `no-magic-numbers`.** É o lar oficial dos parâmetros (§3, ADR-011); medir a regra ali proíbe o próprio remédio que ela prescreve, e `enforceConst` não isenta objeto de parâmetro. Sem esta exceção a regra se autocancela — removes 3.
   - **O glob do corpus passa a ser o caminho real.** A exceção de item 1 apontava para `src/domain/corpus/**`, que não existe: `phraseCorpus.ts` está em `src/infrastructure/repositories/` e seguia sendo medido como código (531 linhas) — removes 1.
9. **A dívida tem teto, e o teto morde.** `npm run lint` roda com `--max-warnings N` (e `lint:baseline` sem o teto, para medir), onde `N` é o passivo medido no último pagamento — hoje 51. O aviso de que "`warn` não bloqueia" é a consequência (−) mais séria deste ADR; o `--max-warnings` é a mitigação que a torna aceitável: **qualquer violação nova quebra o gate, e qualquer violação paga reduz o teto.** O CI executa `npm run lint`, então o ratchet vale no pipeline. Mecanismo verificado: com 48 warnings no subset `domain+application+shared+infrastructure`, teto 47 → `exit 1`, teto 48 → `exit 0`. Pagar a dívida, então, é lowering do teto — o flip para `error` do item 3 é o caso limite `--max-warnings 0`.
10. **`DomainError.statusCode` sai de `src/domain/` como item de dívida separado, com dono.** É o problema arquitetural por trás dos 43 falsos-positivos: a camada de regra de negócio conhece HTTP, o que contraria a separação que a `AGENTS.md` e o ADR-003 descrevem. A correção é mapear `code` → status em `presentation/`, o que tem raio de alcance sobre todo o caminho de erro (`toAppError`, `AppExceptionFilter`, `errorHandler` e os testes correspondentes) e por isso **não** foi feita aqui: misturar-se-ia a um refactor de refresh token em andamento, com 44 das 115 violações medidas em arquivos sob edição ativa. Fica registrado, não resolvido.

**Justificativa:** o projeto já é um exercício explícito de arquitetura (Contexto do ADR-002, ADR-003, ADR-017), mas o que o torna sustentável é o gate, não a declaração — e o gate atual só cobre tipagem. Uniformizar TDD em todas as camadas seria gastar o orçamento de engenharia na camada onde o retorno é menor: `presentation/` acumula 61,60% de branch e 73,47% de funções, mas é composta por adaptadores finos de 30–80 linhas cujo valor está no `domain/` que eles chamam. O modelo por tier compra ~90% do benefício com ~20% do custo e, ao gatear `application/` (o tier que de fato orquestra regra), fecha os 6 use cases zerados. O escalonamento `warn` → `error` é o mecanismo que torna isso honesto: nada é declarado "Clean Code" antes de o lint passar.

**Alternativas consideradas:**

- **Clean Code e TDD "em tudo", literalmente** — descartado: produziria 758 violações (137 produção + 621 testes) e exigiria 90% de cobertura em adaptadores HTTP de baixo valor, além de dar testes a código órfão. Custo alto, sinal baixo, e tornaria a `CONSTITUTION.md` um documento que o próprio build não sustenta.
- **Só registrar Clean Code na `CONSTITUTION.md`, sem gate** — descartado: contradiz o princípio da §1 ("não é convenção documental, é gate de CI") e produz prosa impossível de verificar, que é exatamente a dívida que este ADR fecha.
- **Exigir 90% em todas as camadas imediatamente** — descartado: `presentation/` (61,60% branch) e `shared/` (75% branch) ficariam abaixo do gate, quebrando o CI na primeira execução. Os thresholds deste ADR são um **ratchet** — abaixo do baseline medido, para que só o código novo ou piorado seja barrado.
- **Regras de Clean Code só em `domain/`** — descartado: `presentation` e `infrastructure` concentram 16 das 66 violações de produção (e `domain` 27, `application` 16); restringi-las ao domínio deixaria a maior parte da dívida sem dono.
- **Aceitar as 115 violações como estão e só pagar tudo** — descartado, e é o erro que a retificação abaixo evita: 43 delas eram código HTTP (37%), 3 eram o arquivo de parâmetros do projeto e 1 era um glob de exceção apontando para um diretório inexistente. Pagar isso significa renomear 43 `409` para `HTTP_409` e mexer em 44 arquivos — dos quais 14 estão sob edição ativa no refactor de refresh token. O resultado seria um diff grande, irrevisível, com ~30 defeitos reais de parâmetro enterrados sob ruído cosmético. Calibrar o instrumento antes de pagar a dívida é mais barato e mede mais.
- **Não instalar ratchet e esperar que o flip para `error` resolva** — descartado: o flip depende de a dívida chegar a zero, e sem teto nada impede a dívida de _crescer_ enquanto isso. Os dois mecanismos se cobrem: o ratchet para o crescimento, o flip para o passivo.

**Consequências:**

- (+) O build passa a expressar a arquitetura que o documento sempre afirmou: estilo, complexidade e cobertura verificam-se no CI.
- (+) A dívida fica enumerada e atribuída por camada, com threshold por glob — o CONTRIBUTING deixou de depender de interpretação.
- (+) O tier 2 (obrigatório) fecha os 6 use cases zerados de `application/`, que hoje são o furo mais visível entre domínio e apresentação.
- (+) A regra "código órfão não entra" (item 5) dá destino ao subconjunto Express-only, alinhando com a direção de cleanup já aberta pelo ADR-017.
- (−) **A dívida de 66 violações (63 de produção + 3 de teste) existe e precisa ser paga**; o gate só vira `error` depois disso (item 3). Até lá, o padrão é aspiracional, não garantido.
- (−) `presentation/` segue sem TDD universal — uma tensão real e deliberada com "Clean Code em tudo", registrada aqui para não ser um acidente.
- (−) **`--max-warnings N` é um teto global, não por arquivo.** Ele barra qualquer violação nova, mas não distingue "violação nova" de "violação que mudou de lugar": cortar 3 linhas de `KeyPerformance.ts` e criar 3 magic numbers em outro arquivo é invisível para ele. É ratchet por contagem, não por blame — o suficiente para impedir crescimento, insuficiente para atribuir. O teto só pode descer; para subirá-lo de propósito, é preciso justificação em review.
- (−) `warn` não bloqueia _o estilo em si_ — bloqueia _a alta_ do estilo. Um arquivo já violando pode continuar violando à vontade enquanto a contagem global não subir.
- (−) Limites de Clean Code (`max-params 4`, `max-lines-per-function 50`) são convenções de estilo, não invariantes de correção: há casos legítimos em que 5 parâmetros são mais claros que um objeto de configuração. Devem ser justificados por comentário quando estourados, não silenciados.
- (−) Isentar códigos HTTP do `no-magic-numbers` (item 8) tem um custo: o gate deixa de apontar `res.status(201)` em controller novo, onde `HttpStatus.CREATED` do Nest seria melhor. É uma melhoria de código que ficou sem cobrança automática — aceito conscientemente, porque a alternativa era 43 avisos que mascaravam ~30 defeitos reais.

**Retificação (2026-09-26, mesma data da decisão):** este ADR foi escrito antes de qualquer commit, e a primeira medição da configuração — 115 violações, das quais 112 em produção — continha 49 falso-positivo da própria configuração (item 8). O número de referência do passivo na decisão é **66** (63 de produção + 3 de teste), não 112, e o gate foi calibrado antes de qualquer pagamento. Esse 66 é **baseline histórico** e fica registrado como a justificativa da calibração — não como o passivo corrente, que é medido por `npm run lint:baseline` ematerializado no `--max-warnings` do `package.json`. Os itens 8, 9 e 10 e esta retificação foram adicionados depois da redação original e estão marcados no texto; nenhum princípio já decidido foi revertido, e como a mudança é de **medição** — não de princípio — não dispara o mecanismo de novo ADR da `CONSTITUTION.md` §12. **Primeiro pagamento (2026-09-26, mesmo dia):** o passivo caiu de **66 para 51** e o `--max-warnings` foi rebaixado junto, no mesmo commit — teto que sobra alto é teto que não ancora. As 15 violações liquidadas são todas de `no-magic-numbers` no tier 1 (`domain` 27→15, `application` 16→13, as outras camadas intocadas), extraídas para `src/domain/config/`: os parâmetros de algoritmo (`MASTERY_REGRESSION_SESSIONS` de RN10, `MIN_POOL_WEIGHT_EPSILON` e `POOL_REMAINDER_TIE_EPSILON` de PRD §24.1, `LESSONS_PER_LEVEL`) para `adaptiveParams.ts`; as unidades (`MS_PER_MINUTE`, `MS_PER_DAY`, `CHARS_PER_WORD`) para um `timeUnits.ts` novo, porque `MetricsEngine` e `DailyMetricsAggregate` repetiam a mesma aritmética de WPM sem qualquer relação com o motor adaptativo. A extração foi validada por identidade numérica dos 7 valores (7/7), não só por suíte verde — extrair constante é o refactor em que um dígito trocado passa em teste não coberto. `ProgressionEngine.LESSONS_PER_LEVEL` era `private static readonly`, e `enforceConst` só isenta declaração `const`: o valor era nomeado mas a regra o tratava como inlineado, o que é uma quarta calibração, agora registrada aqui. O mecanismo que faltava e foi acrescentado é o ratchet do item 9, que responde à consequência (−) que a redação original deixava apenas como "mitigação: o item 3 fixa a condição de flip".

**Referências:**

- `CONSTITUTION.md` §1 (regra de dependência, padrão de enforcement), §2 (SOLID mapeado a artefatos), §2.1 (Clean Code), §6 (TDD por tier), §7 (cobertura por tier), §10 (Definition of Done); `eslint.config.mjs` (regras Clean Code, `HTTP_STATUS_CODES`, overrides por camada); `package.json` (`lint` com `--max-warnings N`, `lint:baseline` sem); `vitest.config.ts` (thresholds por glob)
- `ADR.md` ADR-003 (Clean Architecture), ADR-005 (ports), ADR-017 (POO/reuso — `dev`/`start` passados ao Nest, expresso órfão), ADR-018 (MVC); `PRD.md` §8
- Baseline medido em 2026-09-26: 148 regras de lint ativas, 0 de complexidade; 795 testes / 80 arquivos; cobertura por camada conforme o Contexto

---

## ADR-024 — Composition root único no Nest, e a pilha Express removida

**Data:** 2026-09-27
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O ADR-017 migrou a execução para o Nest, mas deixou a pilha Express no lugar como "fallback". Na medição de 2026-09-27 essa coexistência tinha custado três vezes, e **nenhuma delas quebrou a suíte**:

1. **404 em 6 rotas com 809 testes verdes.** `RequestPasswordReset`, `ConfirmPasswordReset`, `AdminResetUserPassword`, `GetAdminSettings`, `UpdateAdminSettings` e `GetLessonPacingStatus` estavam registrados em `src/composition-root.ts` e cobertos pelo `e2e/fullFlow.test.ts` — mas não em `src/main-nest.ts`, o app que `dev`/`start` sobem. Os **ports** já existiam em `useCasePorts.ts`, o que explicava o 0% de cobertura daquele arquivo: interface sem consumidor.
2. **`POST /auth/admin/reset-user-password` sem autenticação.** A rota vivia no mount `/auth`, público por design, e não carregava `authMiddleware` nem `adminGuard` — o guard protegia só `/admin`. Qualquer cliente anônimo com um `userId` redefinia a senha de qualquer conta. **Vulnerabilidade de escalonamento de privilégio**, que a segunda stack tinha escondido atrás de um merge demorado.
3. **`bench/` fora de todo gate.** `tsconfig.json` tem `rootDir: "./src"` e `include` só de `src`; `lint` é `eslint src`. O bench tinha **erros de tipo reais** — `TS2554` em `new RefreshToken(tokenService)` e `TS2345` nos 6 use cases do item 1 — então `npm run bench` estava quebrado sem nenhum gate que percebesse.

O padrão comum aos três: **divergência entre duas fontes de verdade não se manifesta como falha — se manifesta como coisa silenciosamente errada.** Nenhum dos três era detectável pelo que o gate já media. E a pilha morta tinha um custo próprio: 23 arquivos, 2.404 linhas, mais 54 testes (`app.test.ts`) e 7 (`authMiddleware.test.ts`) existem **só** para cobrir código que nenhum script executa — 61 dos 828 testes, ou 7% da suíte, medindo nada que rode.

Pior: o e2e (`src/e2e/fullFlow.test.ts`) rodava sobre o Express. Ou seja, o único teste de integração do projeto **não exercitava o app que sobe em produção** — e era por isso que o item 1 podia passar com o e2e inteiro verde. O `bench/benchHarness.ts` tinha a quarta cópia do grafo, com `buildApp` próprio.

**Decisão:**

1. **`src/nestRuntime.ts` é o composition root único.** Exporta `buildNestProviders(dataSource)` (o grafo), `createNestApp(dataSource, options?)` (o app completo: providers, `AppExceptionFilter`, json/urlencoded, CORS, rate limit; faz `init()` e **não** `listen()`) e `createRuntimeDataSource()`. `src/main-nest.ts` vira entrypoint fino de 21 linhas. As **quatro** cópias do grafo viram **uma**.
2. **A pilha Express é removida** — `composition-root.ts`, `presentation/app.ts`, `routes/`, `middlewares/` (exceto `rateLimitMiddleware.ts`, que o Nest monta via `app.use`), `controllers/` e os testes que só existiam para cobri-la. `AuthenticatedRequest`, `getAuthUserRole` e `MISSING_TOKEN` migraram para `presentation/nest/auth.guard.ts`, de onde `AuthGuard` e `AdminGuard` já importavam — o único consumidor do arquivo removido era a pilha morta. `getAuthUserId` foi descartado (só usado pelos controllers mortos).
3. **O middleware sobe para `createNestApp`, não para o entrypoint.** Filtro de exceção, body parser, CORS e rate limit são montados por `createNestApp`, de modo que e2e e bench exercitem o app real. Montados no entrypoint, o e2e e o bench silently testariam um app sem filtro de erro e sem limitador — e foi exatamente o que aconteceu, silenciosamente, por anos.
4. **A cobertura que só existia na pilha morta é portada, não descartada.** Uma análise por token distintivo achou 12 lacunas brutas (2 já cobertas pelo e2e, 10 reais), que foram anexadas a `presentation/nest/nest-app.test.ts`: 4 rotas de pedagogia/progress-card/ergonomic/practice-status, as bordas do `AuthGuard`, e o mapeamento de erro do `AppExceptionFilter` (403 `SESSION_NOT_OWNED`/`PROFILE_NOT_OWNED`, 409 `USER_ALREADY_EXISTS`, 422 `DISCOMFORT_SIGNALED`, 500 sem vazar detalhe, 404). O bloco de wiring do rate limit foi para o e2e.
5. **Todo teste novo é validado por mutação** — a implementação é revertida e o teste tem que falhar. Quatro mutações e o que elas provam:

   | Mutação                                        | Assertion que falhou     | O que expõe                  |
   | ---------------------------------------------- | ------------------------ | ---------------------------- |
   | Remover o registro do limitador                | `expected 401 to be 429` | o limitador não está montado |
   | Trocar a política de login pela de refresh     | `expected 429 to be 200` | as políticas estão trocadas  |
   | Remover a exigência do prefixo `Bearer `       | `expected 200 to be 401` | um token cru autentica       |
   | Remover `.strict()` do schema de progress-card | `expected 201 to be 422` | `userId` no corpo é aceito   |

   A terceira é a instrutiva: a primeira versão do teste mandava `Authorization: valid` (5 caracteres) e **passava com o guard quebrado** — `slice(7)` de uma string de 5 devolve `""`, que caía na checagem de vazio, não na exigência de prefixo. O 401 vinha por acidente. Só um token de tamanho real deixa resto não vazio em `slice(7)`. **Um teste que passa com a implementação quebrada é decoração, e a mutação é a única forma de saber qual dos dois você escreveu.**

6. **`bench/` entra no gate de tipos.** `tsconfig.json` tem `rootDir: "./src"`, então `bench/` não cabe no `include` dele. `tsconfig.bench.json` estende o principal com `noEmit` e `rootDir: "."`, incluindo `src`/`bench`/`types`; `typecheck` virou `tsc --noEmit && tsc -p tsconfig.bench.json`. `types/autocannon.d.ts` cobre o autocannon 8, que não publica tipos — o que também removeu um `as unknown as` de `runAutocannon`. O lint de `bench/` fica como dívida aberta.
7. **A exclusão de cobertura e a categoria de fronteira acompanham.** `vitest.config.ts` exclui `src/main-nest.ts` (só ele agora); o `eslint.config.mjs` funde as categorias `composition` e `nest-composition` em **uma**, cobrindo `src/nestRuntime.ts` e `src/main-nest.ts`. Uma categoria só porque há um root só — e uma categoria só é uma configuração que não pode ficar apontando para um arquivo que não existe.
8. **O ratchet desce com a remoção:** 51 → **44** warnings. Por regra: `no-magic-numbers` 14, `complexity` 12, `max-params` 8, `max-lines-per-function` 8, `max-lines` 2.
9. **O bench passa a poder reprovar — e a punishing taxa de erro some do veredito.** Rodar os três benches depois da migração expôs dois defeitos que nenhum gate pegava, ambos da mesma família: **verde onde a verdade é vermelho.**
   - **`printReport` só olhava `p95`.** Latência de resposta de erro é _menor_ que a de sucesso: um 404 servido em 2 ms tem p95 melhor que um 200 servido em 40 ms. No `cena-a` com a UI Next no ar errado, o run "VIA UI" deu **8.815 de 8.815 requisições em non-2xx**, p95 de 24,6 ms — e imprimiu `RNF06: ATENDIDO`. O benchmark premiava a falha, desde que ela fosse rápida. Agora `non2xx > 0` reprova, e a saída distingue as duas causas ("latência acima do orçamento" ≠ "requisições falhando — latência não é comparável").
   - **`submit.bench.ts` e `dashboard.bench.ts` logavam a RNF perdida e saíam com 0.** Os jobs `bench` e `bench-dashboard` do CI não tinham como reprovar o pipeline: um job que não pode falhar não é gate. Passaram a setar `process.exitCode = 1` **depois** do cleanup (o `process.exit(1)` no lugar antigo deixaria o SQLite temporário e o servidor pendurados).

   Verificado por mutação: orçamento de p95 impossível → `npm run bench` sai com **1** (antes sairia com 0); caminho saudável → **0**; e `printReport` exercitado direto com os três casos (100% non-2xx → `false`, 0 non-2xx dentro do budget → `true`, p95 estourado → `false`).

**Alternativas considered:**

- **Manter a Express como fallback, como estava desde o ADR-017.** Descartado: a coexistência é ela mesma o defeito. Um fallback que não é exercitado por nenhum script não é caminho de volta — é um segundo código-fonte que envelhece sem ninguém perceber. Três incidentes em um mês são a prova.
- **Deletar só `composition-root.ts` e manter `presentation/app.ts` + `routes/`** (a stack como lib, sem composition root). Descartado: `app.ts` e as rotas _são_ a divergência. Um bundle de rotas sem DI não tem como ficar em paridade com o Nest, e as rotas Express de `admin` eram justamente o item 2 do contexto.
- **Manter o e2e em cima de um app de teste separado** (`buildNestApp` com fakes, o padrão do `nest-app.test.ts`) e deixar o `fullFlow.test.ts` morrer. Descartado: um app de teste montado à parte é uma **quinta** cópia do grafo, e o item 1 deste ADR existe porque o e2e não exercitava o app real. O `fullFlow` sobe `createNestApp` com `DataSource` de verdade agora.
- **Um único controller com `@UseGuards` por método** (mais simples de ler). Descartado: `@UseGuards` por método é uma linha que dá para esquecer, e o esquecimento é silencioso porque a rota responde 200. No nível da classe vale para todas as rotas por construção — e ainda resolve `max-params` sem objeto, já que o DI do Nest resolve construtor por posição.

**Consequências:**

- (+) **Um lugar para registrar caso de uso, repo ou rota**, com o token em `nestTokens.ts`. A classe de bug do item 1 é estruturalmente impossível agora.
- (+) **e2e e bench exercitam o app que sobe em produção.** O `fullFlow.test.ts` encolheu de 18.410 para 9.524 bytes ao perder o grafo duplicado.
- (+) **Dívida de lint paga:** 51 → 44, e 61 testes (7% da suíte) que mediam código morto foram substituídos por cobertura de comportamento real.
- (+) **`npm run bench` voltou a funcionar** (medido: 3.003 requisições, 0 non-2xx, p95 40,4 ms, RNF06 ATENDIDO) e `bench:dashboard` também (20.390 requisições, p95 6,8 ms, RNF11 ATENDIDO). O 0 non-2xx do submit é a prova extra de que montar o rate limit em `createNestApp` não transformou o benchmark em 429.
- (+) **Os jobs de bench do CI passaram a poder reprovar**, e o `printReport` deixou de premiar erro rápido como desempenho.
- (−) **Perde-se a referência da implementação Express** para comparação. Backup em `/tmp/opencode/express-stack-backup` (23 arquivos), e o ADR-002 continua descrevendo o desenho original caso a decisão seja revisitada.
- (−) **Um commit grande.** A remoção e a portabilidade de cobertura estão no mesmo diff porque separar as duas produziria um commit intermediário com cobertura perdida — o que é pior que um commit grande.
- (−) `lint` ainda não cobre `bench/` (`eslint src`); coberto por `tsconfig.bench.json` no tipo, aberto no estilo.

**Referências:**

- `src/nestRuntime.ts` (composition root único), `src/main-nest.ts` (entrypoint), `src/e2e/fullFlow.test.ts` (agora sobre o app real), `bench/benchHarness.ts` (`startBenchApp`), `tsconfig.bench.json`, `types/autocannon.d.ts`, `src/presentation/nest/auth.guard.ts` (guard + `AuthenticatedRequest`)
- `ADR.md` ADR-002 (stack original), ADR-005 (ports), ADR-013 (rate limit), ADR-016 (Nest + Next), ADR-017 (POO/reuso — passagem do `dev`/`start` ao Nest), ADR-018 (MVC), ADR-023 (Clean Code e coverage por tier — este ADR executa o item 5, "código órfão não é teste, é remoção", que ele havia declarado fora de escopo)
- `CONSTITUTION.md` §1 (regra de dependência), §7 (cobertura por tier); `eslint.config.mjs` (categorias de arquivo, `CLEAN_CODE_SEVERITY`); `vitest.config.ts` (exclusões)
- Baseline medido em 2026-09-27: 819 testes / 81 arquivos; 44 warnings de lint; cobertura global 93,61% stmts / 85,94% branches / 94,03% lines

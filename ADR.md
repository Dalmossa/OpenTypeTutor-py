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
* (+) Contratos de domínio (`IProgressRepository`, `KeyPerformance`, etc.) verificáveis em tempo de compilação.
* (+) Refatoração mais segura.
* (−) Curva de configuração inicial maior.

**Referências:**
* Documentação oficial do TypeScript (incl. `strict`): https://www.typescriptlang.org/docs/

---

## ADR-002 — Stack de backend: Node.js + Express + TypeORM + SQLite

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O projeto é um serviço REST multiusuário, com objetivo explícito de aprendizado de arquitetura de software moderna (Clean Architecture, DDD, SOLID), não um MVP comercial sob pressão de prazo. Precisa de um runtime simples de operar localmente/individualmente, com caminho de evolução para um banco mais robusto sem reescrever regra de negócio.

**Decisão:**
* **Runtime/linguagem:** Node.js + TypeScript.
* **Framework HTTP:** Express — minimalista, não impõe estrutura sobre `domain/`/`application/`, favorece a regra de dependência da Seção 3 do PRD.
* **ORM:** TypeORM — mesma escolha do protótipo client-side anterior (consistência de conhecimento acumulado), suporta múltiplos dialetos de banco sem trocar de ORM.
* **Banco de dados:** SQLite em arquivo — zero-ops para um projeto individual/de aprendizado, sem custo de infraestrutura externa.

**Justificativa:** O propósito do projeto (praticar arquitetura) muda o cálculo de custo-benefício frente a uma stack "de produção": o runtime precisa ser simples de operar por um único desenvolvedor localmente; o Web framework não pode competir com a estrutura de camadas do PRD; e a persistência deve oferecer um caminho barato de evolução (ver ADR-005) sem exigir infraestrutura externa nesta fase.

**Alternativas consideradas:**
* NestJS — descartado por impor uma estrutura opinativa (decorators, módulos) que compete com a estrutura de Clean Architecture definida no PRD, adicionando complexidade não essencial ao objetivo de aprendizado.
* Prisma no lugar do TypeORM — descartado por menor familiaridade prévia e por o TypeORM já ter sido validado no protótipo anterior.
* PostgreSQL desde o início — descartado nesta fase por exigir infraestrutura externa (servidor de banco) sem benefício imediato para um único desenvolvedor operando localmente; a porta `IUserRepository`/etc. mantém essa troca barata no futuro (ver ADR-005).

**Consequências:**
* (+) Ambiente de desenvolvimento roda com `npm install` + um arquivo `.sqlite`, sem Docker/serviço externo.
* (+) Troca de banco no futuro é uma nova implementação de repositório, não uma reescrita de domínio (Dependency Inversion, ver ADR-005).
* (−) SQLite tem limitações reais de concorrência de escrita sob carga — aceitável para o escopo atual (uso individual/portfólio), documentado como risco conhecido, não ignorado (mitigação no ADR-012).

**Referências:**
* Express: https://expressjs.com/
* TypeORM: https://typeorm.io/
* SQLite: https://www.sqlite.org/

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
* (+) Fronteiras claras entre regra de negócio e detalhe técnico (HTTP, ORM, hashing, JWT).
* (+) Testes de domínio não dependem de banco, servidor HTTP ou bibliotecas de infraestrutura (RNF07 do PRD).
* (−) Mais boilerplate e indireção que uma estrutura simples — aceito conscientemente.

**Referências:**
* The Clean Architecture (Robert C. Martin): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
* Domain-Driven Design (Eric Evans): https://domainlanguage.com/ddd/
* `PRD.md` Seção 4; `CONSTITUTION.md` Seção 1

---

## ADR-004 — Autenticação: JWT stateless + bcrypt

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O PRD anterior a esta versão não definia nenhuma estratégia de autenticação, apesar de já expor endpoints por `userId` para um serviço multiusuário — uma lacuna funcional real identificada em revisão técnica. É necessário provar identidade sem acoplar o domínio a uma biblioteca de auth específica.

**Decisão:**
* Senhas: hash com **bcrypt** (`saltRounds` configurável, nunca hardcoded — ver `adaptiveParams`/`authParams`).
* Sessão de autenticação: **JWT stateless** assinado pelo servidor, carregando `userId` como claim principal.
* Verificação: `authMiddleware` em `presentation/middlewares/`, executado antes de qualquer controller protegido; extrai e valida o token, injeta `userId` autenticado no contexto da requisição.
* O domínio nunca recebe senha, token ou header — apenas o `userId` já resolvido, passado pelo caso de uso.

**Justificativa:** O serviço é multiusuário, então a identidade precisa ser provada em cada requisição; a escolha de um mecanismo stateless simplifica a operação (sem infraestrutura de sessão) e o isolamento da biblioteca de auth em `infrastructure/` mantém a regra de dependência da ADR-003 intacta.

**Alternativas consideradas:**
* Sessões stateful (cookie + storage server-side) — descartado por exigir infraestrutura adicional de sessão (ex.: Redis) sem benefício claro no escopo atual de aprendizado/portfólio.
* OAuth/login social — descartado nesta fase por complexidade desproporcional ao objetivo do Domain Core; pode ser adicionado depois sem alterar o modelo de `User` (apenas um novo fluxo de emissão de token).
* Refresh tokens — adiado; o escopo atual aceita reautenticação por expiração simples do JWT (revisitado no ADR-010 e implementado na Fase 3).

**Consequências:**
* (+) Serviço permanece stateless, simplificando escalabilidade futura.
* (+) Domínio permanece isolado de bibliotecas de auth (`jsonwebtoken`, `bcrypt` só existem em `infrastructure/`).
* (−) Revogação de token antes da expiração não é trivial em JWT stateless puro — aceito como limitação conhecida desta fase; não há funcionalidade de "logout forçado" no MVP.
* Parâmetros de segurança (`BCRYPT_SALT_ROUNDS`, `JWT_EXPIRATION`, `MIN_PASSWORD_LENGTH`) ficam centralizados e marcados "A VALIDAR" (PRD Seção 26), nunca hardcoded no meio da lógica de autenticação (validados no ADR-010).

**Referências:**
* RFC 7519 (JSON Web Token): https://datatracker.ietf.org/doc/html/rfc7519
* bcrypt (node): https://github.com/kelektiv/node.bcrypt.js
* OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

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
* (+) Trocar SQLite por PostgreSQL exige apenas uma nova implementação de repositório + composição — sem alterar os serviços de domínio.
* (+) Testes unitários de domínio podem usar repositórios em memória (fakes), sem SQLite real.
* Migração de dados existentes ao trocar de banco deve ser tratada como migração versionada, nunca como reset (ver `CONSTITUTION.md`, Seção 8).

**Referências:**
* Dependency Inversion Principle (Clean Architecture): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
* `PRD.md` Seção 3 (regra de dependência)

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
* (+) Um único ponto de verdade por domínio de parâmetro (produto vs. segurança).
* (+) Facilita auditoria de segurança (todos os parâmetros sensíveis em um arquivo, não espalhados).
* Regra "nenhuma constante de algoritmo adaptativo ou de segurança pode ser hardcoded" formalizada em `CONSTITUTION.md`, Seção 3.

**Referências:**
* Twelve-Factor App — Config: https://12factor.net/config
* `PRD.md` Seção 26 (parâmetros "A VALIDAR")

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
* (+) Fonte de conteúdo trocável sem tocar no motor adaptativo.
* (−) Qualidade do corpus inicial (curadoria manual) é um trabalho à parte, fora do escopo desta decisão técnica.

**Referências:**
* N-gram (Wikipedia): https://en.wikipedia.org/wiki/N-gram
* `PRD.md` Seção 25 (conteúdo de reforço)

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
* (+) Retry seguro por padrão, sem exigir nada do cliente.
* (−) Não cobre o caso de dois submits concorrentes chegando antes de o primeiro persistir o estado `COMPLETED` (condição de corrida) — mitigação (lock otimista/transação no repositório) é decisão de implementação da Fase 5, não deste ADR.

**Referências:**
* Idempotent Requests (Stripe): https://stripe.com/docs/api/idempotent_requests
* HTTP semantics (RFC 9110), métodos idempotentes: https://datatracker.ietf.org/doc/html/rfc9110
* `PRD.md` RN14

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
* (+) Resultado do arredondamento é 100% determinístico e testável.
* (+) A regra de desempate reforça o mesmo princípio pedagógico que já motiva os pesos 60/25/15.

**Referências:**
* Largest remainder method (Wikipedia): https://en.wikipedia.org/wiki/Largest_remainder_method
* `PRD.md` RN19

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
* `BCRYPT_SALT_ROUNDS = 10` — descartado por ser o piso mínimo, sem margem para evolução de hardware.
* `BCRYPT_SALT_ROUNDS = 14` — descartado por latência perceptível em cada auth request sem ganho proporcional.
* Exigência de complexidade de senha — descartada por contradizer NIST 800-63B e gerar padrões previsíveis.
* `k6` para benchmark — descartado por exigir Go/binário externo, fora do stack Node/TS do projeto.
* CI como ambiente de referência — descartado por overhead de configuração sem benefício para baseline individual.

**Consequências:**
* (+) Todos os "A VALIDAR" da Seção 26 do PRD resolvidos; Fase 5 desbloqueada.
* (+) RN22 evita métricas enganosas em sessões triviais/acidentais, melhorando fidelidade do produto.
* (+) Refresh tokens na Fase 3 (não "fora de fase") elimina o trade-off insustentável do JWT stateless puro.
* (+) `autocannon` + ambiente local = benchmark executável em segundos, sem dependências externas.
* (−) `JWT_EXPIRATION = 24h` ainda exige relogin diário; aceito como limitação temporária até Fase 3 entregar refresh tokens.

**Referências:**
* NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
* OWASP Password Storage Cheat Sheet (factor de trabalho do bcrypt): https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
* autocannon: https://github.com/mcollina/autocannon

---

## ADR-011 — Idioma do produto: pt-BR para conteúdo, inglês para identificadores de código

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O `PRD.md` (Seção 1.1) declara que o idioma oficial do produto é português do Brasil, refletindo que o único desenvolvedor e o público-alvo falam pt-BR. Sem escopo explícito, essa declaração é ambígua para uma IA implementando o código: "traduzir o produto" poderia ser lido como traduzir só o texto voltado ao usuário, ou também nomes de classes, variáveis, rotas e códigos de erro — decisões com consequências técnicas muito diferentes, e algumas partes do projeto (Fases 0–2 do `BACKLOG.md`) já foram implementadas antes desta ADR existir.

**Decisão:** Separar "idioma do produto" (o que o usuário final lê) de "idioma do código" (o que o desenvolvedor/IA lê):
* **pt-BR:** campo `message` de respostas de erro, mensagens de log destinadas a leitura humana, conteúdo de lições/exercícios, documentação de produto.
* **Inglês:** identificadores de código (classes, funções, variáveis, arquivos), rotas HTTP, campo `code` de erro, chaves estruturadas de log, mensagens de commit (Conventional Commits).
* Comentários de código em pt-BR são aceitáveis (estilo, não requisito) — não fazem parte desta decisão.
* O catálogo de códigos de erro e suas mensagens pt-BR canônicas fica centralizado no PRD (Seção 28.5), nunca inventado ad-hoc em um controller.

**Justificativa:** "Idioma do produto" e "idioma do código" têm consequências técnicas distintas; sem essa separação explícita, uma IA/desenvolvedor poderia traduzir identificadores e quebrar a compatibilidade com o ecossistema Node/TypeScript, ou manter mensagens de erro em inglês e violar a Seção 1.1 do PRD. É preciso uma definição inequívoca que cubra o que já foi implementado e o que vier.

**Alternativas consideradas:**
* Traduzir também identificadores de domínio (`TypingSession` → `SessaoDeDigitacao`, `KeyPerformance` → `DesempenhoTecla`) — descartada por dois motivos: (a) reduz a compatibilidade com convenções e tooling do ecossistema Node.js/TypeScript (linters, autocompletar de bibliotecas, exemplos de documentação), que assumem identificadores em inglês; (b) o único leitor do código-fonte é o próprio desenvolvedor e ferramentas de IA, para quem a barreira de idioma no código não é o problema real — o problema real é a experiência do usuário final do produto, que é resolvido pela tradução do conteúdo, não dos identificadores.
* Deixar a validação de entrada (Zod) com as mensagens padrão em inglês, documentando isso como "detalhe técnico aceitável" — descartada porque contradiz diretamente a Seção 1.1 do PRD: uma mensagem de erro de validação é texto lido pelo usuário final, então precisa do mesmo tratamento que qualquer outra mensagem de erro (ver PRD §28.5).

**Consequências:**
* (+) Escopo sem ambiguidade para qualquer IA/desenvolvedor implementando a partir de agora.
* (+) Catálogo único de mensagens de erro evita traduções inconsistentes espalhadas pelos controllers.
* (−) Exige trabalho de retrofit nas Fases 0–2 já implementadas antes desta ADR (mensagens de erro/log e schemas Zod potencialmente em inglês) — rastreado em `BACKLOG.md` TASK-069/070/071.

**Referências:**
* `PRD.md` Seção 1.1 e §28.5 (catálogo de erros)

---

## ADR-012 — Driver SQLite do TypeORM 1.x (better-sqlite3) e mitigação de concorrência de escrita

**Data:** 2026-09-11
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O TypeORM 1.x instalado (v1.1.1) removeu o driver antigo baseado no pacote `sqlite3` (node-sqlite3) — a união de `DataSourceOptions` só oferece `better-sqlite3` e `sqljs` para SQLite, e a Fase 5 (TASK-049/050) precisa de repositórios TypeORM concretos. O pacote `sqlite3` declarado no ADR-002 ficou, portanto, sem uso e foi removido das dependências. Em paralelo, a TASK-054 exige mitigar (não ignorar) o risco de concorrência de escrita do SQLite sob o fluxo de submit.

**Decisão:**
* Driver **`better-sqlite3`** (síncrono, conexão única) no lugar de `sqlite3` — mesma base SQLite e mesmo ORM, sem mudança de API das interfaces de domínio.
* Entidades de persistência usando **`EntitySchema`** (sem decorators) — o tsconfig do projeto não habilita `experimentalDecorators`/`emitDecoratorMetadata`, e o `EntitySchema` é a forma canônica do TypeORM 1.x.
* Mitigações da TASK-054 centralizadas em `infrastructure/database/databaseParams.ts`:
  * `enableWAL = true` (journal WAL — escritores não bloqueiam leitores e reduz SQLITE_BUSY);
  * `timeout = BUSY_TIMEOUT_MS` (5000 ms — aguarda lock antes de disparar `SQLITE_BUSY`);
  * `PRAGMA foreign_keys = ON` via `prepareDatabase`;
  * único escritor síncrono por conexão (característica do próprio driver) elimina lock de escrita entre requisições concorrentes do mesmo processo.
* Datas persistidas como texto ISO-8601 (UTC, formato Z) e campos compostos (`targetKeys`, `keystrokes`, `metrics`) como texto JSON — sem dependência da conversão automática de `datetime` do driver, resultado determinístico para round-trip.
* A reconstrução de entidade de banco usa `TypingSession.reconstruct(props)` adicionada ao domínio (mesmo padrão de `KeyPerformance`), mantendo a porta `ITypingSessionRepository` intacta.

**Justificativa:** O driver declarado na ADR-002 deixou de ser suportado pelo TypeORM 1.x — permanecer nele não é uma opção viável; entre as alternativas do plugin, `better-sqlite3` é a única com persistência idiomática em arquivo e escritor síncrono único, que por si só elimina grande parte do risco de `SQLITE_BUSY` no processo — que é exatamente o que a TASK-054 pede para mitigar.

**Alternativas consideradas:**
* Permanecer no driver `sqlite3` — descartado: o TypeORM 1.x não o lista mais em `DataSourceOptions`.
* `sqljs` (sql.js, WASM) — descartado por exigir autosave manual e não expor file-persistence idiomática.
* Lock otimista por versão em `TypingSession` — adiado: fluxo de submit já é idempotente (RN14/ADR-008) e o uso é individual/local; reaparece se houver multi-escrita concorrente real (Fases futuras), sem mudança de contrato.

**Consequências:**
* (+) TASK-054 mitigada no nível de driver/PRAGMA — sem reescrever o domínio nem a API dos repositórios.
* (+) Trocar para PostgreSQL (ADR-005) continua sendo apenas nova implementação de repositório.
* (−) `better-sqlite3` é módulo nativo — requer `npm install` com toolchain de build disponível (prebuilds cobrem os LTS atuais).

**Referências:**
* SQLite WAL mode: https://www.sqlite.org/wal.html
* better-sqlite3: https://github.com/WiseLibs/better-sqlite3
* TypeORM `EntitySchema`: https://typeorm.io/entity-schema

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
* Rate limiting por e-mail além de por IP — adiado como segundo nível de defesa: diferenciar por e-mail responderia de forma distinta para contas existentes vs. inexistentes, facilitando enumeração de usuários; a janela por IP cobre a força bruta distribuída do mesmo endereço sem vazar informação.
* Limitador baseado em serviço externo (Redis/`@upstash/ratelimit`) — descartado por exigir infraestrutura fora do escopo atual (mesma razão da escolha do SQLite no ADR-002); registrado como evolução futura, não requisito da TASK-073.

**Consequências:**
* (+) Aprovação formal e rastreável do único item da TASK-067 com custo-benefício imediato, com parâmetros e código de erro especificados antes da implementação (spec-first).
* (+) OAuth e recuperação de senha permanecem com decisão de escopo registrada e gatilhos objetivos de reabertura.
* (+) §13.4 do PRD atualizado para refletir a realidade atual (refresh tokens já implementados; demais itens com status formal).
* (−) TASK-073 (implementação do rate limiting) entra como item "A fazer" no BACKLOG, consumindo tempo dedicado seguindo SDD (teste → implementação → catálogo §28.5 que já referencia).

**Referências:**
* OWASP Denial of Service Cheat Sheet (rate limiting): https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
* `PRD.md` §13.4 e §28.5

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
* (+) TASK-068 encerrada como avaliação formal; nenhuma mudança de código.
* (+) Decisões prévias (ADR-002/005/012) permanecem intactas e ganham gatilho de revisão explícito.
* (−) Se o produto evoluir para multiusuário, haverá trabalho de migração de dados versionada (CONSTITUTION §8) — mitigado pelo baixo custo garantido pelo ADR-005.

**Referências:**
* Appropriate Uses For SQLite (SQLite): https://www.sqlite.org/whentouse.html
* PostgreSQL: https://www.postgresql.org/docs/
* `PRD.md` RN14; `BACKLOG.md` TASK-068

---

## ADR-015 — Topologia da documentação de requisitos: SRD como container que referencia o PRD

**Data:** 2026-09-12
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A auditoria Sommerville (PRD v1.4) confirmou que o PRD já cobre ~90% do conteúdo de um SRD (requisitos de usuário §2.3, requisitos de sistema §27/§28, parágrafo de requisitos §2, restrições de projeto §13.3). Faltavam apenas modelos de sistema (Sommerville Cap. 8), especificação de interface explícita (§6.4) e assunções/dependências — mas a experiência do drift `JWT_EXPIRATION` mostrou que **qualquer duplicação de RN/RNF em dois arquivos gera divergência silenciosa**.

**Decisão:** Criar `SRD.md` como **container** (estrutura formal de SRD de Sommerville §6.2–6.4) que **não duplica** RNs, RNFs, parâmetros ou catálogo de erros — apenas os referencia por seção do PRD. O SRD agrega o que o PRD não tem: modelos de sistema em **Mermaid** (máquinas de estado de `TypingSession`/`KeyPerformance`, classDiagram do domínio, sequence de submit/refresh, contexto), tabela consolidada de rotas HTTP (§6, índice — não contrato) e assunções/dependências/requisitos inferidos (§7), espelhando fielmente o código implementado em `src/`.

**Justificativa:** Modelos que divergem do código têm valor negativo (documentam um sistema imaginário); mantê-los "ainda mais fiéis que o PRD" torna o SRD o repositório canônico da **forma implementada**, sem criar segundo dono para regras (o PRD continua a fonte única de RN/RNF). A rastreabilidade é marcada por tabelas RN → modelo → teste (SRD §9 A), e a precedência em divergência é: PRD > SRD.

**Alternativas consideradas:**
* SPR (Software Requirements Specification) único fusionado ao PRD — descartado: engordaria o PRD com diagramas/interface e misturaria "o quê/por quê" (PRD) com "forma implementada" (SRD), contrariando o §13 do CONSTITUTION.
* SRD com cópias das RNs "por completeza" — descartado: recriaria o volante de duplicação que produziu o drift JWT.

**Consequências:**
* (+) Mapa único navegável: requisito → modelo → teste (SRD §9 A).
* (+) Diagramas Fiéis ao código (identificadores em inglês, ADR-011), auditáveis por comparação direta com `src/`.
* (−) Requer disciplina: mudança de RN **primeiro** no PRD, depois reflexo nos modelos do SRD — política registrada em `CONSTITUTION.md` §12 e explicitada em `SRD.md` §8.
* (−) Um segundo arquivo de requisitos a revisar a cada mudança (mitigado pela regra "SRD nunca é fonte de regra").

**Referências:**
* `PRD.md` v1.4 (fonte única); `SRD.md` (container); `CONSTITUTION.md` §12

---

## ADR-016 — Migração de apresentação e stack web: Next.js (UI) + Nest.js (backend)

**Data:** 2026-09-14
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O desktop (customtkinter/Python) tem latência percebida de **carregamento** (bootstrap lento), não por tecla — confirmado na medição e na triagem do código (`desktop/src/opentype_tutor/views/screens/session_screen.py` bufferiza keystrokes e submete em lote, então a latência não é round-trip por tecla). A RN06/RNF06 já define o objetivo de latência de submit. A medição mostrou que o gargalo é o bootstrap SPA/desktop.

**Decisão:** Migrar a apresentação para **Next.js** (App Router, TS, consumindo o REST existente — o domínio/use cases permanecem no backend, a RN14 de idempotência continua valendo; o navegador **não reimplementa** regra de domínio). E, no backend, migrar **Express → Nest.js**, **reconciliando o ADR-002** (linha 56), que havia descartado o NestJS por "estrutura opinativa que compete com a Clean Architecture do PRD".

**Reconciliação com ADR-002/PRD §13.4:** O ADR-002 descartou NestJS pelo critério "clean architecture como objetivo de aprendizado ⇒ framework mínimo". Mudou o contexto: (a) a Clean Architecture já está **estabelecida e testada em `src/`** (Fases 0–7, `CONSTITUTION.md` §1) — o objetivo de aprendizado migrou do "esqueleto vazio" para "frameworks reais usados em produção"; (b) o `PRD §13.4` deixava a alternativa web **fora de escopo** — o usuário explicitamente inverteu isso. O Nest.js **preserva** o domínio intacto (controllers/serviços Nest ficam em `application`/`presentation`/`infrastructure`, injetados por módulos; `domain/` não importa Nest). O backend **não é reescrito do zero**: os use cases/entidades de `src/` são migrados (mover/adapter), não redesenhados.

**Alternativas consideradas:**
* Manter Express + apenas trocar a UI — descartado: o usuário decidiu trocar o backend também (Nest.js), e o ADR-002 não previa essa necessidade.
* Tauri/Electron (UI em janela nativa) — adiado: decisão de distribuição em aberto (§ item "distribuição"), não bloqueia Next.js (a mesma UI serve a ambos os empacotadores).
* React puro sem framework — descartado: perde SSR/SSG e o roteamento que aliviam a latência de carga (RNF06).

**Consequências:**
* (+) UI web com SSR/SSG ataca a latência de **carregamento** (RNF06) — não só a de tecla.
* (+) Next consumindo REST reutiliza 100% das RNs do domínio (RN14 idempotência, RN22 insufficient-data) sem duplicar nada no navegador.
* (−) Stack maior (dois apps TS + servidor); investimento em infra estrutura Nest (módulos) para migrar o Express — dimensionado no BACKLOG Fase 8, mitigado por: domínio/use cases intactos + ports `I*Repository`/`I*Service` (ADR-005) mantêm a troca como implementação de infraestrutura.
* (−) Distribuição **decidida em 2026-09-14 — Opção A (UI no navegador)**: o usuário abre o navegador e digita um endereço local; nada a instalar. B (Tauri) descartada nesta versão.

**Referências:**
* `PRD.md` §13.4 (alternativa web, antes fora de escopo — agora invertida); RN06/RNF06 (latência); RN14 (idempotência); RN22 (insufficient-data); `ADR.md` ADR-002 (contraditado), ADR-005 (ports); `CONSTITUTION.md` §1

---

## ADR-017 — POO formal e reuso de código na Fase 8 (migração web)

**Status:** Aceito · **Data:** 2026-09-14 · **Decisão:** **A manutenção das regras de domínio**

**Contexto:** A decisão ADR-016 estabeleceu Next.js (UI) + Nest.js (back-end) consumindo o REST de `src/`, garantindo que o navegador **não reimplementa** regra de domínio (RN14 idempotência, RN22 insufficient-data) — o domínio permanece no back-end, reutilizado via REST. O que permanece **implícito** (e este ADR torna **explícito, obrigatório e rastreável**) é a política de implementação: o projeto já é, de fato, **POO (Programação Orientada a Objetos)** — `src/application/use-cases/*.ts` são classes, `src/domain/entities`/`value-objects` são classes, `desktop/src/opentype_tutor/models/*.py` usam herança (ex.: `BaseScreen` subclass `CTkFrame`), e os ports `I*Repository`/`I*Service` (ADR-005) são contratos de classes que Clean Architecture injeta por dependência. Essa orientação a objetos precisa ser **política escrita** da Fase 8 — não uma preferência de estilo de um único desenvolvedor.

**Decisão:**
* **POO é obrigatório** em toda a Fase 8: UI web (Next.js — componentes de interface como classes de camada de apresentação que consomem o REST), back-end (Nest.js — controllers/services como classes injetando os **mesmos** use cases/ports já POO de `src/`), e desktop legado (já POO, inalterado).
* **Reuso de código em vez de reescrita (DRY aplicado a camadas):** a migração **reutiliza** o domínio e os use cases existentes — move/adapta, **nunca reescreve** — respeitando ADR-016 (navegador não reimplementa RN), ADR-005 (ports) e a barreira de dependência do `CONSTITUTION.md`.
* O back-end Nest **injeta as mesmas classes** que o Express atual (mesmos use cases, mesmos ports, mesmas entidades) — a troca Express→Nest é uma troca de camada de infraestrutura/framework, **não** uma reimplementação do domínio (consistente com ADR-002 → ADR-016 reconcliliação).
* **Fora de escopo desta política:** reescrever regras de negócio no navegador (proibido — RN14/RN22 permanecem no back-end; ADR-016).

**Reconciliação:**
* **ADR-016** (migração wweb) — este ADR-017 é o **suplemento de implementação** de ADR-016: mesma decisão de distribuição (A — no navegador, consumindo REST), agora com a exigência explícita de POO/reuso. Sem alteração de RNs — RN14/RN22/RN16/RN17 continuam rastreáveis no `PRD`.
* **ADR-002** (Clean Architecture objetivo) — POO não conflita: DDD/POO (classes, encapsulamento, injeção de dependência) É o estilo que Clean Architecture já prescreve na casa desde `CONSTITUTION.md` §9 (Clean Architecture). Torna-se apenas explícito no ADR que rege a Fase 8.
* **RNF06 (latência)** — POO no navegador reutilizando REST mantém a medição 150ms/p95 (TASK-080) **no mesmo backend** — não há segunda implementação a medir.

**Referências:**
* `PRD.md` RN06/RNF06 (latência), RN14 (idempotência no back-end — permanece), RN22 (insufficient-data — permanece), RN25 (mastery — permanece), §13.4 (alternativa wweb); `ADR.md` ADR-002, ADR-005 (ports), ADR-016 (migração web); `CONSTITUTION.md` §1, §7, §9 (Clean Architecture); `BACKLOG.md` TASK-082 (rastreio) na Fase 8

---

## ADR-018 — MVC como protocolo da camada de apresentação (desktop e web)

**Data:** 2026-09-15
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** A arquitetura documentada cobre o backend (Clean Architecture, ADR-003) e a política de implementação da Fase 8 (POO + reuso, ADR-017), mas o padrão arquitetural da **camada de apresentação** nunca foi explicitado. O desktop (`desktop/src/opentype_tutor/`) já implementa, de fato, a tríade MVC + camada de serviços: `models/` (Pydantic, espelho dos DTOs), `views/` (telas e componentes customtkinter), `controllers/` (orquestração de eventos e estado, herdam `BaseController`), `services/` (comunicação REST via `api_client`). O `SRD §1.2` trata `desktop/` como "outro produto", e a Fase 8 (ADR-016) introduz um novo frontend **Next.js** sem padrão de apresentação definido — a forma de implementar a UI ficaria a cargo de cada agente/desenvolvedor.

**Decisão:** Adotar **MVC como protocolo obrigatório da camada de apresentação do OpenType Tutor**, nos dois clientes — em linha com o que o desktop já implementa:
* **Model** — representações de dados da UI (DTOs), espelho dos contratos REST, sem entidades de domínio. No desktop: `models/*.py` (Pydantic). No Next.js (Fase 8): tipos TS e estado do cliente.
* **View** — renderização e captura de eventos de UI. No desktop: `views/` (screens, components, theme). No Next.js: páginas e componentes React.
* **Controller** — orquestração de eventos de UI, validação de apresentação e coordenação com os serviços de API; **nunca contém regra de negócio de domínio**. No desktop: `controllers/*.py` (herdam `BaseController`, compartilham `AppState`). No Next.js: handlers de página/ação consumindo os serviços REST.
* **Services (camada auxiliar de transporte)** — comunicação HTTP com o backend REST e mapeamento de erros; isolam os controllers de detalhes de transporte. No desktop: `services/*.py` (AuthService, LessonService, SessionService, ProgressService, ApiClient).

Regras de dependência da apresentação:
1. **View → Controller → Services → REST**: a View não fala com Model/Services diretamente; toda interação passa pelo Controller.
2. **Nenhuma RN é reimplementada na apresentação** — RN14 (idempotência), RN22 (insufficient-data), RN16/RN17 (auth/posse) permanecem no backend, consumidas via REST (ADR-016/017).
3. **Modelos da UI são DTOs**, nunca entidades de domínio — o domínio continua no backend (ADR-003/005).

**Justificativa:** MVC é o padrão canônico de aplicações com interface (GUI e web page-driven), isola renderização de estado e de transporte — exatamente a estrutura que o desktop já adota de fato. Registrá-lo elimina a divergência código↔documento (hoje inexistente nos docs) e dá à Fase 8 um padrão explícito: a UI Next não fica "livre" para reimplementar regras ou misturar transporte com renderização. É complementar, não substituto, à Clean Architecture do backend: o padrão se aplica **dentro** da camada de apresentação.

**Alternativas consideradas:**
* Manter implícito como está — descartado: a Fase 8 cria um segundo cliente sem padrão definido, e a revisão de código não teria base formal para exigir separação View/Controller.
* MVVM/Bloc/Redux como padrão da Fase 8 — adiado/rejeitado: acrescenta infraestrutura de estado reativo desnecessária para um cliente consumidor de REST; se o estado do cliente ganhar complexidade distribuída, avalia-se adicionar camada de estado sem substituir o MVC.
* MVP (Presentador) — rejeitado: diverge do que o desktop já implementa; padronizar MVC mantém convergência entre os dois clientes e o ADR-017 (POO).

**Consequências:**
* (+) Documentação da apresentação alinhada ao código atual do desktop (estrutura já existe — sem refactor necessário).
* (+) Fase 8 passa a ter contrato de implementação para View/Controller/Services no Next.js (rastreado em TASK-083).
* (+) Revisão (ADR/CODE REVIEW) passa a checar a regra "Views→Controllers→Services; sem RN na apresentação" em qualquer cliente.
* (−) O termo "protocolo MVC" deve ser usado de forma consistente nos dois clientes; exige disciplina para não deixar a UI Next evoluir para código monolítico em componentes.

**Referências:**
* `ADR.md` ADR-016 (migração web), ADR-017 (POO/reuso), ADR-003/005 (Clean Architecture — backend permanece); `SRD.md` §1.2/§3; `desktop/src/opentype_tutor/` (estrutura `models/views/controllers/services`); `BACKLOG.md` TASK-083; `PRD.md` RN14, RN16/RN17, RN22

---

## ADR-019 — Pacing de prática: bloco de 15 min de prática ativa → pausa mínima de 3 min (RN33)

**Data:** 2026-09-17
**Responsável:** Dalmo Pereira
**Status:** Aceito

**Contexto:** O PRD já trata saúde como regra de domínio (RN24 check-in ergonômico, RN28 regra de segurança por desconforto, RN30 lembrete de pausa no fechamento), mas a prática de digitação não é **pausada por tempo**: o usuário pode encadear lições indefinidamente, e a orientação "pausas a cada 30–60 min" é apenas texto. O feedback de produto pede um pacing mensurável: a cada 15 minutos de prática ativa, uma pausa mínima de 3 minutos (alongar os braços, beber água, ativar a circulação) antes de iniciar a próxima lição — com foco em condicionamento físico e concentração. **Requisito decidido em conjunto:** a lição em curso nunca é interrompida; se o bloco de 15 min estourar no meio de uma lição, ela conclui normalmente e a pausa vale a partir da conclusão.

**Decisão:** Introduzir a **RN33** (PRD §27), implementada como política de domínio no backend e consumida via REST pelos dois clientes (desktop e web):
* **Domínio:** nova entidade `PracticePacingState` (por `userId`): `accumulatedActiveMs` (desde o início do bloco) e `lastSessionEndedAt` (fim da última sessão completada). Lógica pura: `recordCompletedSession`, `isBreakRequired(now)`, `breakRemainingMs(now)`, `startNewBlock(now)` — todo relógio injetado (testável sem espera real).
* **Parâmetros:** `PRACTICE_BLOCK_DURATION_MS = 900000` e `MIN_BREAK_DURATION_MS = 180000` centralizados em `domain/config/adaptiveParams.ts` (ADR-006 — nunca literais inline).
* **Porta:** `IPracticePacingRepository` (ADR-005) com `findByUserId`/`save`; implementações `InMemory` (testes) e `TypeORM` (SQLite, `practice_pacing`), isoladas por `userId` (RN17).
* **Enforcement no ciclo de sessão:** `StartTypingSession` recusa **criar** uma sessão quando o bloco está estourado e a pausa não completou — `BreakRequiredError` → `BREAK_REQUIRED` (409, catálogo §28.5); `SubmitTypingSession` acumula a prática ativa da sessão recém-concluída (apenas na primeira conclusão — RN14 idempotência preservada; sessões `ABANDONED` não acumulam — RN13). Nenhum estado de sessão em curso é alterado pela política.
* **Consulta para a UI:** `GetPracticeStatus` em `GET /me/practice-status` devolve `{ accumulatedActiveMs, practiceBlockMs, minBreakMs, breakRequired, breakRemainingMs }` — os clientes **não** reimplementam a regra nem hardcodam os limites; apenas cronometram a pausa restante (ADR-018: nenhuma RN na apresentação).
* **Bloco novo após pausa:** ao iniciar uma sessão permitida com `accumulatedActiveMs ≥ bloco` (pausa já cumprida), o acumulador zera — nova sequência 15:3. Contagem por dia calendário local, reiniciada automaticamente (o acumulador vive no estado persistido e é comparado ao relógio).

**Justificativa:** micro-pausas curtas reduzem fadiga e desconforto musculoesquelético e o leve descanso favorece a retomada da atenção — alinha-se à metodologia ergonômica já assumida (NR17, RN24/RN28). Colocar a regra no domínio (e não no cliente) permite reuso entre desktop e web, teste determinístico (TDD) e rastreabilidade — a UI apenas reflete o estado; a decisão de health/pacing permanece no backend, coerente com ADR-018 (nenhuma RN na apresentação).

**Alternativas consideradas:**
* Timer só no cliente (duplicado em desktop e web) — descartado: política em dois lugares sem rastreio nem teste, divergência silenciosa e viola o espírito do ADR-018.
* Backend apenas valida, clientes cronometram o 15 min — o requisito em discussão foi a favor do backend mandar o acumulado e o tempo restante, mantendo os clientes simples e consistentes.
* Interromper a lição ao estourar o bloco ("Dentro da lição") — descartado: o requisito decide que a lição em curso sempre conclui; interromper geraria sessão incompleta e adicionaria transições de estado desnecessárias (`TypingSession` só pausa por ação do usuário).

**Consequências:**
* (+) RN33 rastreável e testável (domain + use case + endpoint); clientes simples (só mostram estado/countdown).
* (+) `StartTypingSession` e `SubmitTypingSession` ganham um dependência (`IPracticePacingRepository` + relógio injetável) — todos os pontos de composição e testes precisam ser atualizados.
* (−) Sessões longas (>15 min ativos) não geram pausa intermediária por decisão de requisito; o break só vale entre lições.
* (−) Nova tabela `practice_pacing` e migração; estado por usuário adicional para persistir.
* (0) RNF06 não é afetado: o caminho `submit` ganha apenas uma WRITE extra (~µs) no SQLite; o budget de 150ms (p95) não é tensionado por RN33 — sem necessidade de redesenhar o bench.

**Referências:**
* `PRD.md` RN33 (§27), §26 (params), §28.5 (`BREAK_REQUIRED`); `CONSTITUTION.md` §5 (SDD); `ADR.md` ADR-006 (params), ADR-005 (ports), ADR-018 (sem RN na apresentação); `BACKLOG.md` TASK-089+ (fase de implementação)

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
* **Performance:** agregação por request (filtrar 10⁴–10⁵ sessões, somar e derivar métricas) não atende `p95 ≤ 500ms` em SQLite de arquivo com 1 ano de dados; pré-computar converte a leitura do dashboard em poucas linhas de agregados (52 semanais → 365 diárias/ano).
* **RNF06 preservado:** o `submit` ganha 1 WRITE (upsert) por primeira conclusão — mesma magnitude de RN33/ADR-019; o orçamento de 150ms não é tensionado.
* **Testabilidade TDD:** o agregado é domínio puro (somas/derivações, relógio e timezone injetáveis) — consistente com ADR-003/005.
* **Recharts:** padrão de mercado para séries temporais em React, sem lock-in de fornecedor e sem camada canvas/mobile extra; independence da stack Next já assumida (ADR-016), reduzindo superfície de dependência em relação a alternativas (Chart.js, D3 raw, Nivo).

**Alternativas consideradas:**
* **Agregação sob demanda por request** (SQL `GROUP BY` sobre sessões na hora) — descartada: varredura O(histórico) por view por janela, custo cresce com o tempo, não atinge RNF11 no pior caso de 1 ano.
* **Agregação em memória/cache** (LRU por usuário, invalidação no submit) — descartada: materialização simples + determinística no store é mais simples de manter, testar e re-gerar (reset de progresso RN31) do que invalidação de cache; RNF11 medida sem cache externo (mesmo espírito do RNF06).
* **Chart.js / D3 / Nivo** — Chart.js: canvas, menos tipada no ecossistema TSR; D3 raw: verboso para 8 widgets; Nivo: camada sobre D3 com mais indireção. Recharts: SVG + declarativo, JSX-aligned com o codebase.
* **Desktop (customtkinter) com gráficos** — fora do escopo da Fase 9: o painel avançado é web-first (ADR-016); o desktop mantém a tela estática de progresso atual.

**Consequências:**
* (+) RNF11 rastreável e verificável (`bench:dashboard`, seed 52 semanas); RNF06 revalidado (submit +1 WRITE upsert).
* (+) Dashboard determinístico e pré-decidível; reset de progresso (RN31) deve limpar também os agregados e o log de transições (estendido no TASK-097).
* (−) Duas tabelas novas (`daily_metrics_aggregate`, `key_mastery_transition`) + campo `timezone` em `user_profile` e migração.
* (−) `SubmitTypingSession` e `KeyPerformance.recordSessionEnd` ganham dependências novas (portas `IDailyMetricsAggregateRepository`/`IKeyMasteryTransitionRepository`) — pontos de composição e testes atualizados.
* (0) Nenhuma RN no cliente (ADR-018); o web apenas renderiza DTOs pré-agregados.

**Referências:**
* `PRD.md` RN34–RN37 (§27), §26 (params `MPI_*`/`DASHBOARD_*`), §28.1 (RNF11), §28.4 (conflito RNF06×RNF11), §29, §30 (FASE 9); `CONSTITUTION.md` §5 (SDD); `ADR.md` ADR-006 (params), ADR-005 (ports), ADR-016 (Next), ADR-018 (sem RN na apresentação), ADR-019 (padrão de WRITE extra no submit); `BACKLOG.md` TASK-092–100
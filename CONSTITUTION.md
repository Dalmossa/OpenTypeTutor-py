# Constitution — OpenType Tutor Backend REST API

Princípios permanentes de engenharia: regras que não mudam por feature, e que qualquer código novo — escrito por você ou gerado por uma IA — deve respeitar. Diferente do `PRD.md` (o quê/por quê) e do `ADR.md` (decisões técnicas pontuais e seu histórico), este documento é sobre **como construir, sempre**.

Se um princípio aqui precisar mudar, isso é uma decisão explícita, registrada como novo ADR referenciando este documento — não uma exceção silenciosa em um PR.

---

## 1. Regra de Dependência (Clean Architecture)

- A dependência sempre aponta **para dentro**: `presentation/` → `application/` → `domain/` ← `infrastructure/`.
- `domain/` **nunca** importa de `infrastructure/`, `presentation/` ou de bibliotecas externas (`express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, etc.).
- `domain/services/` (`MetricsEngine`, `AdaptiveLessonEngine`, `ProgressionEngine`) depende apenas de `domain/entities`, `domain/value-objects` e `domain/repositories` (interfaces) — nunca de `infrastructure/` ou `presentation/` diretamente.
- Toda comunicação com banco de dados, hashing de senha, emissão/verificação de token, ou qualquer serviço externo passa por uma interface (`domain/repositories/` ou um port equivalente), implementada em `infrastructure/`.
- `application/use-cases/` orquestra `domain/` + as interfaces de `domain/repositories/` — não contém regra de negócio própria, apenas coordenação.
- `presentation/` traduz HTTP (requisição/resposta, status codes, formato de erro) para chamadas de `application/use-cases/` — nunca contém regra de negócio, e nunca acessa `infrastructure/repositories/` diretamente (sempre via `application/`).
- **Enforcement:** verificado por lint automatizado (`eslint-plugin-boundaries` ou regra customizada de import). Uma violação de boundary quebra o build — não é convenção documental, é gate de CI.

---

## 2. Princípios SOLID — aplicação concreta

Cada princípio está mapeado ao **artefato que o comprova**, não à prosa. Se o artefato divergir, o que vale é o artefato — e a divergência é um bug a corrigir, não uma exceção a registrar.

- **S (Single Responsibility):** `MetricsEngine` só calcula métricas; `AdaptiveLessonEngine` só decide o próximo exercício de reforço; `ProgressionEngine` só controla a progressão curricular. `authMiddleware` só verifica token; não decide autorização de domínio (isso é do caso de uso, ver ADR-004). _Comprovado por:_ `authMiddleware.ts` apenas extrai `userId`/`role` do token; a posse é checada nos use cases via `application/services/sessionCommand.ts::assertSessionOwner`, que lança `SessionNotOwnedError`.
- **O (Open/Closed):** adicionar um novo layout de teclado deve ser possível sem modificar `MetricsEngine` ou `AdaptiveLessonEngine` — ambos recebem `Layout` como parâmetro e não fazem branch sobre o valor do layout. _Comprovado por:_ `domain/value-objects/Layout.ts` é o **único** ponto de toque ao adicionar layout (constante `VALID_LAYOUTS` + union `LayoutValue`); o novo valor precisa ser adicionado lá e nowhere mais nos engines.
- **L (Liskov Substitution):** qualquer implementação de `IUserRepository`, `ITypingSessionRepository`, `IKeyPerformanceRepository`, `IProgressRepository`, `INGramRepository` (SQLite hoje, outro banco amanhã, fake em teste) é substituível sem alterar quem a consome. _Comprovado por:_ `TypeOrm*Repository` e `InMemory*Repository` coexistem para 6 interfaces e são usados de forma intercambiável nos composition roots e nos testes.
- **I (Interface Segregation):** interfaces de `domain/repositories/` expõem só os métodos que o consumidor específico precisa — evitar uma interface genérica de storage com dezenas de métodos não relacionados. _Comprovado por:_ 13 interfaces, de 2 a 7 métodos, 5–21 linhas cada; não existe interface de storage agregada.
- **D (Dependency Inversion):** `domain/` e `application/` definem os contratos (interfaces); `infrastructure/` os implementa. Nunca o inverso — `infrastructure/` depende de `domain/`, não o contrário. _Comprovado por:_ regra de dependência da §1, **imposta por `eslint-plugin-boundaries`** (violação = falha de build, não revisão).

---

## 2.1 Clean Code — o que é automatizável é gate; o resto é revisão (ADR-023)

A §1 falhou historicamente por declarar sem medir: as 148 regras de lint ativas cobriam apenas type-safety, e nenhuma regra de complexidade ou tamanho existia. Clean Code segue o mesmo padrão — **divida o que a máquina julga do que o humano julga**, e nunca declare o que o build não sustenta.

**Gate automático** (`eslint.config.mjs`). Todas as regras estão em `warn`, em todos os tiers — ativar `error` no mesmo dia da decisão geraria 43 erros e quebraria `npm run lint` e o CI. A severidade-alvo por tier está declarada em `CLEAN_CODE_SEVERITY`, no topo do config: o flip `warn` → `error` é mecânico e depende de zerar a dívida de produção (ADR-023, item 3). Limites:

| Regra                    | Limite                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `complexity`             | ≤ 10                                                                                                                |
| `max-lines`              | ≤ 300 (não se aplica a migrações, seeds e corpus — são dados)                                                       |
| `max-lines-per-function` | ≤ 50                                                                                                                |
| `max-depth`              | ≤ 4                                                                                                                 |
| `max-params`             | ≤ 4                                                                                                                 |
| `no-magic-numbers`       | ignora `0`, `1`, `-1`, `2`, `100`, índices e códigos HTTP; **desligado em `*.test.ts` e em `src/domain/config/**`** |

- Parâmetro de algoritmo, peso, threshold ou segurança **nunca** é literal na lógica (ver §3) — `no-magic-numbers` é a rede de segurança, não o mecanismo; o mecanismo é §3.
- Em `*.test.ts` ficam desligadas `no-magic-numbers`, `max-lines` e `max-lines-per-function` (fixture numérica e tabela de casos são dados, não lógica); `complexity` e `max-params` continuam valendo — teste com 6 parâmetros é tabela que deveria virar helper. Migrações, seeds e corpus também saem das regras de tamanho: são dados por natureza.
- **O gate só mede o que ele entende** (ADR-023, item 8). Três isenções, cada uma com motivo: códigos HTTP são constantes da RFC 9110, não magic numbers; `src/domain/config/**` é o lar dos parâmetros, e medir `no-magic-numbers` ali proibiria o próprio remédio; o corpus tem path próprio. Isentar da _medição_ não é aceitar o código — o `statusCode` de `DomainError` dentro de `src/domain/` continua sendo vazamento de arquitetura e está aberto como dívida (ADR-023, item 10).
- Limite de estilo estourado de forma legítima **se justifica por comentário** na linha, explicando por que o caso real exige. Não se desliga com `eslint-disable` genérico.
- **Revisão humana** (sem gate possível): nomes que revelam intenção, funções que fazem uma coisa, ausência de duplicação, comentário que explica _por quê_ e não _o quê_. Isto não é automatizável e não é fingido ser.

**Ratchet.** `warn` sozinho não impede crescimento da dívida, então `npm run lint` roda com `--max-warnings N` e `npm run lint:baseline` mede sem teto (ADR-023, item 9). O efeito: **violação nova quebra o gate; violação paga é teto abaixado.** O teto só desce. O CI executa `npm run lint`, então vale no pipeline — e pagar a dívida até zero é o caso limite `--max-warnings 0`, que é o flip para `error` do item 3.

O valor de `N` é o **passivo medido no momento da última calibragem**, e por isso não é escrito nesta seção: um número transcrito em documento de princípio envelhece na primeira edição de código e passa a mentir. A fonte é o próprio `package.json` (que o gate valida a cada execução) e o comando `npm run lint:baseline`. A obrigação de quem paga a dívida é **baixar o `--max-warnings` no mesmo commit** — teto que sobra alto é teto que não ancora.

---

## 3. Configuração e parâmetros

- Nenhuma constante de algoritmo adaptativo (pesos do `WeakKeyScore`, thresholds, critérios de mastery) pode ser hardcoded dentro da lógica do algoritmo — vivem em `domain/config/adaptiveParams.ts` (ADR-006).
- Nenhum parâmetro de segurança (custo do bcrypt, expiração de JWT, comprimento mínimo de senha) pode ser hardcoded dentro da lógica de autenticação — vivem em `infrastructure/auth/authParams.ts` (ADR-004, ADR-006).
- Parâmetros marcados "A VALIDAR" no PRD devem permanecer identificáveis no código (comentário ou nome explícito) até serem validados e essa marcação ser removida via atualização do PRD.

---

## 4. TypeScript e qualidade estática

- Modo `strict` obrigatório em todo o projeto (ADR-001).
- Proibido `any` implícito ou explícito sem justificativa comentada no código.
- Todo tipo de domínio (`User`, `TypingSession`, `KeyPerformance`, `Progress`, etc.) tem sua modelagem em `domain/entities` ou `domain/value-objects`, refletindo exatamente o modelo do PRD Seções 6–22.
- `User.passwordHash` nunca é incluído em nenhum DTO de saída (`application/dtos/`) — a exclusão é responsabilidade explícita do mapeamento entidade → DTO, não uma omissão acidental de serialização.

---

## 5. Spec-Driven Development (SDD)

- Nenhum código em `domain/`, `application/` ou `domain/services/` é escrito sem rastreabilidade a uma especificação formal em `PRD.md` (um RF, uma RN, ou um critério de aceitação).
- Fluxo obrigatório para qualquer feature nova: **PRD (o quê/por quê) → ADR, se envolver decisão técnica nova (como) → CONSTITUTION, se envolver princípio novo de processo → testes → implementação.**
- Se, durante a implementação, surgir a necessidade de comportamento não previsto no PRD, a especificação é atualizada **primeiro** (nova versão do PRD, com changelog), e só depois o código é escrito.
- Um Pull Request que implementa um RF/RN referencia o identificador na descrição (ex.: "Implementa RN16 e RN17 — autenticação e posse de recurso"), tornando o histórico do Git navegável de volta ao PRD.
- Parâmetros marcados "A VALIDAR" só têm seus valores alterados através de atualização do PRD — nunca por ajuste silencioso direto no código de configuração.

---

## 6. Test-Driven Development (TDD) por tier de risco (ADR-023)

O tier de uma camada é definido pela **natureza do código**, não por conveniência. Um adaptador HTTP de 40 linhas não tem o mesmo risco de regressão que um cálculo de mastery — exigir o mesmo ciclo dos dois é burocracia, não qualidade. O gate é por tier; a justificativa está no ADR-023.

| Tier  | Camada                                                 | Natureza                                  | Exigência                                                                                                                            |
| ----- | ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | `domain/`, `shared/`                                   | regra de negócio e contrato compartilhado | **TDD obrigatório**, ciclo Red → Green → Refactor                                                                                    |
| **2** | `application/`                                         | orquestração de casos de uso              | **TDD obrigatório** (era apenas recomendado)                                                                                         |
| **3** | `infrastructure/repositories/`                         | contrato com estado externo               | **TDD obrigatório** em repositórios                                                                                                  |
| **4** | `infrastructure/` (auth, logger, rate limit, database) | adaptador técnico                         | Teste onde há decisão, não só integração mecânica                                                                                    |
| **5** | `presentation/`                                        | adaptador HTTP fino                       | **Por exceção**: teste de endpoint nos fluxos críticos (autenticação, submit de sessão, acesso não autorizado, padronização de erro) |

Regras que valem para todos os tiers:

- Toda regra de negócio (RN01–RN40 do PRD) é candidata natural a TDD: o teste nomeado pela regra deve existir e falhar antes de a regra ser implementada.
- TDD não substitui a Seção 5: o teste escrito primeiro deriva de uma especificação já existente no PRD, não é inventado ad-hoc durante a codificação.
- **Código sem rota viva e sem dono não recebe teste — recebe remoção.** Um use case que não é alcançável por nenhum composition root não é dívida de cobertura, é código órfão (ver ADR-023, item 5).
- Reclassificar a camada de um tier é decisão de constitution e exige novo ADR, pelo mecanismo da Seção 12.

---

## 7. Testes — pirâmide e cobertura mínima por tier (ADR-023)

O threshold é **por glob, verificado pelo CI** (`vitest.config.ts`, aplicado só por `npm run test:coverage`). Os valores são um _ratchet_: fixados abaixo do baseline medido em 2026-09-26, de modo que só código novo ou piorado é barrado — nunca o legado.

| Tier | Camada                  | statements | functions | branches | Baseline medido       |
| ---- | ----------------------- | ---------- | --------- | -------- | --------------------- |
| 1    | `src/domain/**`         | 90%        | 90%       | 90%      | 94,74 / 95,15 / 90,74 |
| 1    | `src/shared/**`         | 85%        | 100%      | 70%      | 88,89 / 100 / 75,00   |
| 2    | `src/application/**`    | 80%        | 80%       | 75%      | 85,85 / 82,18 / 76,95 |
| 3–4  | `src/infrastructure/**` | 75%        | 75%       | 75%      | 88,57 / 86,56 / 78,48 |
| 5    | `src/presentation/**`   | 70%        | 70%       | 60%      | 80,08 / 73,47 / 61,60 |

Demais regras desta seção:

- `src/main-nest.ts` fica **fora do threshold** — é wiring de bootstrap (ADR-024: `src/nestRuntime.ts` é o composition root único), exercitado pelo e2e (`src/e2e/fullFlow.test.ts`), não por unidade. Incluí-lo a 0% não mediria qualidade, só ruído.
- Toda regra de negócio listada no PRD (RN01–RN40) tem um teste nomeado de forma rastreável a ela (ex.: `RN14 - submit de sessão já completada não reprocessa`).
- Nenhum critério de aceitação do PRD é considerado "implementado" sem um teste automatizado correspondente.

---

## 8. Versionamento de dados do domínio

- Mudanças nos parâmetros do algoritmo adaptativo (pesos, thresholds, critérios de mastery) são tratadas como **migração de dados versionada**, nunca como reset do histórico do usuário.
- Toda migração de banco (schema do TypeORM, ou eventual troca de SQLite por outro banco, ver ADR-005) preserva o histórico existente do usuário, com rotina de migração explícita e testada.

---

## 9. Segurança — princípios permanentes

- Senha em texto puro nunca trafega além do corpo da requisição de login/registro (HTTPS em produção é pressuposto, não uma feature deste backend) e nunca é logada, persistida ou incluída em mensagem de erro.
- `userId` usado em qualquer operação vem sempre do token verificado (`authMiddleware`), nunca de parâmetro de rota, query string ou corpo da requisição fornecido pelo cliente (PRD Seção 13.1).
- Toda checagem de posse de recurso (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`) é responsabilidade do caso de uso, não do middleware de autenticação — o middleware resolve identidade; o caso de uso resolve autorização sobre o agregado específico.
- Erros de autenticação/autorização retornam o formato padronizado de erro (Seção 10) sem vazar detalhes internos (ex.: nunca diferenciar "e-mail não existe" de "senha errada" na mensagem de login, para não facilitar enumeração de usuários).

---

## 10. Convenções de processo

- **Idioma (ADR-011):** o campo `message` de qualquer erro retornado ao cliente, mensagens de log destinadas a leitura humana e conteúdo de lições são sempre em pt-BR, seguindo o catálogo de `PRD.md` Seção 28.5 — nenhuma mensagem nova é inventada fora dele. Identificadores de código (classes, funções, variáveis, arquivos), rotas HTTP, o campo `code` de erro e mensagens de commit permanecem em inglês, por convenção do ecossistema Node.js/TypeScript. Comentários de código em pt-BR são aceitáveis como escolha de estilo. Schemas de validação (Zod) exigem mapa de mensagens customizado — o comportamento padrão da biblioteca é em inglês e não cumpre esta regra sozinho.
- **Formato de erro:** toda resposta de erro segue `{ "error": { "code": "...", "message": "..." } }` (RNF02 do PRD) — nunca stack trace ou mensagem de biblioteca interna vazando para o cliente.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), rastreando no histórico do Git quais commits implementam qual RF/RN do PRD.
- **Branching:** trunk-based simples (branches curtas por feature, merge frequente).
- **Definition of Done:** uma feature só é concluída quando (a) o critério de aceitação do PRD correspondente passa, (b) os thresholds de cobertura do tier da Seção 7 são respeitados, (c) nenhuma regra de dependência da Seção 1 é violada, (d) nenhum parâmetro sensível foi hardcoded (Seção 3), (e) nenhum limite de Clean Code da Seção 2.1 foi estourado sem justificativa por comentário, e (f) a UI foi validada pelos gates dela quando a mudança a toca — `web/` não roda no CI, então isso é responsabilidade de quem commita (ver ADR-022).

---

## 11. Observabilidade mínima

- `AdaptiveLessonEngine` e `MetricsEngine` expõem logging estruturado em modo de desenvolvimento (ex.: decisão de classificação de tecla, composição da lição de reforço, resultado do desempate de arredondamento) — erros nesses módulos não quebram a aplicação, apenas degradam a experiência silenciosamente sem exceção visível.
- Logs nunca incluem `passwordHash`, senha em texto puro, ou o JWT completo (Seção 9, RNF08 do PRD).

---

## 12. Integridade documental

- Uma ADR aceita não é reescrita em conteúdo depois de aprovada. Se a decisão mudar, uma **nova** ADR a supera, referenciando-a; apenas o `Status` da antiga é atualizado para apontar ao sucessor.
- O `PRD.md` é a **fonte única** de RN/RNF/parâmetros/catálogo de erros. O `SRD.md` é um **container** que referencia o PRD e agrega modelos de sistema, a especificação de interface e assunções — **nunca duplica uma regra** (ADR-015). Em qualquer divergência, prevalece o PRD.
- Mudança de regra de negócio/NFR: atualizar **primeiro** o PRD; refletir nos modelos do SRD quando aplicável; não inversamente.

---

## 13. Escopo deste documento

Este documento **não** decide qual framework, banco de dados ou biblioteca usar — isso é `ADR.md`. Também **não** define o que o produto faz — isso é `PRD.md`. Qualquer proposta de mudança aqui deve ser avaliada quanto ao impacto nos dois outros documentos.

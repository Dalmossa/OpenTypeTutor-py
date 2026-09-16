# Constitution — OpenType Tutor Backend REST API

Princípios permanentes de engenharia: regras que não mudam por feature, e que qualquer código novo — escrito por você ou gerado por uma IA — deve respeitar. Diferente do `PRD.md` (o quê/por quê) e do `ADR.md` (decisões técnicas pontuais e seu histórico), este documento é sobre **como construir, sempre**.

Se um princípio aqui precisar mudar, isso é uma decisão explícita, registrada como novo ADR referenciando este documento — não uma exceção silenciosa em um PR.

---

## 1. Regra de Dependência (Clean Architecture)

* A dependência sempre aponta **para dentro**: `presentation/` → `application/` → `domain/` ← `infrastructure/`.
* `domain/` **nunca** importa de `infrastructure/`, `presentation/` ou de bibliotecas externas (`express`, `typeorm`, `bcrypt`, `jsonwebtoken`, `zod`, etc.).
* `domain/services/` (`MetricsEngine`, `AdaptiveLessonEngine`, `ProgressionEngine`) depende apenas de `domain/entities`, `domain/value-objects` e `domain/repositories` (interfaces) — nunca de `infrastructure/` ou `presentation/` diretamente.
* Toda comunicação com banco de dados, hashing de senha, emissão/verificação de token, ou qualquer serviço externo passa por uma interface (`domain/repositories/` ou um port equivalente), implementada em `infrastructure/`.
* `application/use-cases/` orquestra `domain/` + as interfaces de `domain/repositories/` — não contém regra de negócio própria, apenas coordenação.
* `presentation/` traduz HTTP (requisição/resposta, status codes, formato de erro) para chamadas de `application/use-cases/` — nunca contém regra de negócio, e nunca acessa `infrastructure/repositories/` diretamente (sempre via `application/`).
* **Enforcement:** verificado por lint automatizado (`eslint-plugin-boundaries` ou regra customizada de import). Uma violação de boundary quebra o build — não é convenção documental, é gate de CI.

---

## 2. Princípios SOLID — aplicação concreta

* **S (Single Responsibility):** `MetricsEngine` só calcula métricas; `AdaptiveLessonEngine` só decide o próximo exercício de reforço; `ProgressionEngine` só controla a progressão curricular. `authMiddleware` só verifica token; não decide autorização de domínio (isso é do caso de uso, ver ADR-004).
* **O (Open/Closed):** adicionar um novo layout de teclado deve ser possível sem modificar `MetricsEngine` ou `AdaptiveLessonEngine`. Adicionar um novo tipo de lição (`type`) não deve exigir alterar `ProgressionEngine` por completo, apenas estender o que já existe.
* **L (Liskov Substitution):** qualquer implementação de `IUserRepository`, `ITypingSessionRepository`, `IKeyPerformanceRepository`, `IProgressRepository`, `INGramRepository` (SQLite hoje, outro banco amanhã, fake em teste) é substituível sem alterar quem a consome.
* **I (Interface Segregation):** interfaces de `domain/repositories/` expõem só os métodos que o consumidor específico precisa — evitar uma interface genérica de storage com dezenas de métodos não relacionados.
* **D (Dependency Inversion):** `domain/` e `application/` definem os contratos (interfaces); `infrastructure/` os implementa. Nunca o inverso — `infrastructure/` depende de `domain/`, não o contrário.

---

## 3. Configuração e parâmetros

* Nenhuma constante de algoritmo adaptativo (pesos do `WeakKeyScore`, thresholds, critérios de mastery) pode ser hardcoded dentro da lógica do algoritmo — vivem em `domain/config/adaptiveParams.ts` (ADR-006).
* Nenhum parâmetro de segurança (custo do bcrypt, expiração de JWT, comprimento mínimo de senha) pode ser hardcoded dentro da lógica de autenticação — vivem em `infrastructure/auth/authParams.ts` (ADR-004, ADR-006).
* Parâmetros marcados "A VALIDAR" no PRD devem permanecer identificáveis no código (comentário ou nome explícito) até serem validados e essa marcação ser removida via atualização do PRD.

---

## 4. TypeScript e qualidade estática

* Modo `strict` obrigatório em todo o projeto (ADR-001).
* Proibido `any` implícito ou explícito sem justificativa comentada no código.
* Todo tipo de domínio (`User`, `TypingSession`, `KeyPerformance`, `Progress`, etc.) tem sua modelagem em `domain/entities` ou `domain/value-objects`, refletindo exatamente o modelo do PRD Seções 6–22.
* `User.passwordHash` nunca é incluído em nenhum DTO de saída (`application/dtos/`) — a exclusão é responsabilidade explícita do mapeamento entidade → DTO, não uma omissão acidental de serialização.

---

## 5. Spec-Driven Development (SDD)

* Nenhum código em `domain/`, `application/` ou `domain/services/` é escrito sem rastreabilidade a uma especificação formal em `PRD.md` (um RF, uma RN, ou um critério de aceitação).
* Fluxo obrigatório para qualquer feature nova: **PRD (o quê/por quê) → ADR, se envolver decisão técnica nova (como) → CONSTITUTION, se envolver princípio novo de processo → testes → implementação.**
* Se, durante a implementação, surgir a necessidade de comportamento não previsto no PRD, a especificação é atualizada **primeiro** (nova versão do PRD, com changelog), e só depois o código é escrito.
* Um Pull Request que implementa um RF/RN referencia o identificador na descrição (ex.: "Implementa RN16 e RN17 — autenticação e posse de recurso"), tornando o histórico do Git navegável de volta ao PRD.
* Parâmetros marcados "A VALIDAR" só têm seus valores alterados através de atualização do PRD — nunca por ajuste silencioso direto no código de configuração.

---

## 6. Test-Driven Development (TDD)

* Para `domain/entities`, `domain/value-objects` e `domain/services` (cobertura mínima na Seção 7), o ciclo é **Red → Green → Refactor**: o teste que expressa o comportamento esperado é escrito e falha primeiro; só então a implementação mínima que o faz passar é escrita; a refatoração acontece com o teste já verde.
* Toda regra de negócio (RN01–RN22 do PRD) é candidata natural a TDD: o teste nomeado pela regra deve existir e falhar antes de a regra ser implementada.
* Para `application/use-cases/`, TDD é recomendado mas não obrigatório — testes de integração escritos logo após a implementação são aceitáveis.
* Para `presentation/`, TDD não é exigido; testes de endpoint pontuais bastam nos fluxos críticos (autenticação, submit de sessão, acesso não autorizado).
* TDD não substitui a Seção 5: o teste escrito primeiro deriva de uma especificação já existente no PRD, não é inventado ad-hoc durante a codificação.

---

## 7. Testes — pirâmide e cobertura mínima

* `domain/entities`, `domain/value-objects`, `domain/services`: cobertura de teste unitário mínima de **90%** — coração do produto (WPM, WeakKeyScore, mastery, regressão, arredondamento de pools).
* `application/use-cases`: testes de integração cobrindo os principais casos de uso (registrar/logar usuário, iniciar/pausar/retomar/abandonar/submeter sessão, gerar lição de reforço, consultar progresso).
* `presentation/`: testes de endpoint pontuais nos fluxos críticos (autenticação, formato de erro padronizado, autorização de recurso). Não é necessário buscar cobertura alta aqui.
* Toda regra de negócio listada no PRD (RN01–RN22) tem um teste unitário nomeado de forma rastreável a ela (ex.: `RN14 - submit de sessão já completada não reprocessa`).
* Nenhum critério de aceitação do PRD é considerado "implementado" sem um teste automatizado correspondente.

---

## 8. Versionamento de dados do domínio

* Mudanças nos parâmetros do algoritmo adaptativo (pesos, thresholds, critérios de mastery) são tratadas como **migração de dados versionada**, nunca como reset do histórico do usuário.
* Toda migração de banco (schema do TypeORM, ou eventual troca de SQLite por outro banco, ver ADR-005) preserva o histórico existente do usuário, com rotina de migração explícita e testada.

---

## 9. Segurança — princípios permanentes

* Senha em texto puro nunca trafega além do corpo da requisição de login/registro (HTTPS em produção é pressuposto, não uma feature deste backend) e nunca é logada, persistida ou incluída em mensagem de erro.
* `userId` usado em qualquer operação vem sempre do token verificado (`authMiddleware`), nunca de parâmetro de rota, query string ou corpo da requisição fornecido pelo cliente (PRD Seção 13.1).
* Toda checagem de posse de recurso (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`) é responsabilidade do caso de uso, não do middleware de autenticação — o middleware resolve identidade; o caso de uso resolve autorização sobre o agregado específico.
* Erros de autenticação/autorização retornam o formato padronizado de erro (Seção 10) sem vazar detalhes internos (ex.: nunca diferenciar "e-mail não existe" de "senha errada" na mensagem de login, para não facilitar enumeração de usuários).

---

## 10. Convenções de processo

* **Idioma (ADR-011):** o campo `message` de qualquer erro retornado ao cliente, mensagens de log destinadas a leitura humana e conteúdo de lições são sempre em pt-BR, seguindo o catálogo de `PRD.md` Seção 28.5 — nenhuma mensagem nova é inventada fora dele. Identificadores de código (classes, funções, variáveis, arquivos), rotas HTTP, o campo `code` de erro e mensagens de commit permanecem em inglês, por convenção do ecossistema Node.js/TypeScript. Comentários de código em pt-BR são aceitáveis como escolha de estilo. Schemas de validação (Zod) exigem mapa de mensagens customizado — o comportamento padrão da biblioteca é em inglês e não cumpre esta regra sozinho.
* **Formato de erro:** toda resposta de erro segue `{ "error": { "code": "...", "message": "..." } }` (RNF02 do PRD) — nunca stack trace ou mensagem de biblioteca interna vazando para o cliente.
* **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), rastreando no histórico do Git quais commits implementam qual RF/RN do PRD.
* **Branching:** trunk-based simples (branches curtas por feature, merge frequente).
* **Definition of Done:** uma feature só é concluída quando (a) o critério de aceitação do PRD correspondente passa, (b) a cobertura da Seção 7 é respeitada, (c) nenhuma regra de dependência da Seção 1 é violada, (d) nenhum parâmetro sensível foi hardcoded (Seção 3).

---

## 11. Observabilidade mínima

* `AdaptiveLessonEngine` e `MetricsEngine` expõem logging estruturado em modo de desenvolvimento (ex.: decisão de classificação de tecla, composição da lição de reforço, resultado do desempate de arredondamento) — erros nesses módulos não quebram a aplicação, apenas degradam a experiência silenciosamente sem exceção visível.
* Logs nunca incluem `passwordHash`, senha em texto puro, ou o JWT completo (Seção 9, RNF08 do PRD).

---

## 12. Integridade documental

* Uma ADR aceita não é reescrita em conteúdo depois de aprovada. Se a decisão mudar, uma **nova** ADR a supera, referenciando-a; apenas o `Status` da antiga é atualizado para apontar ao sucessor.
* O `PRD.md` é a **fonte única** de RN/RNF/parâmetros/catálogo de erros. O `SRD.md` é um **container** que referencia o PRD e agrega modelos de sistema, a especificação de interface e assunções — **nunca duplica uma regra** (ADR-015). Em qualquer divergência, prevalece o PRD.
* Mudança de regra de negócio/NFR: atualizar **primeiro** o PRD; refletir nos modelos do SRD quando aplicável; não inversamente.

---

## 13. Escopo deste documento

Este documento **não** decide qual framework, banco de dados ou biblioteca usar — isso é `ADR.md`. Também **não** define o que o produto faz — isso é `PRD.md`. Qualquer proposta de mudança aqui deve ser avaliada quanto ao impacto nos dois outros documentos.

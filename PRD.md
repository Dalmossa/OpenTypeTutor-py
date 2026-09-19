# Product Requirements Document (PRD)
## OpenType Tutor — Backend REST API

**Versão:** 1.6
**Status:** Ativo — pronto para implementação completa (Domain Core + Infrastructure), pendências "A VALIDAR" resolvidas (ADR-010)
**Tipo:** Product Requirements Document (PRD)
**Arquitetura:** Clean Architecture + DDD + SOLID
**Stack:** Node.js + TypeScript + Express + TypeORM + SQLite
**Documentos relacionados:** `ADR.md` (decisões técnicas), `CONSTITUTION.md` (princípios de engenharia), `BACKLOG.md` (itens executáveis), `SRD.md` (container de requisitos: modelos de sistema em Mermaid, especificação de interface e assunções — referencia este documento como fonte única de RN/RNF/catálogo, ADR-015)

**Nota de proveniência:** este documento inicia um projeto novo, em repositório próprio, que reaproveita e amadurece o modelo de domínio de um protótipo client-side anterior (SPA React + IndexedDB, mantido em outra pasta e fora do escopo deste documento). Nenhuma decisão de arquitetura do protótipo anterior é herdada automaticamente — todas as decisões de stack deste projeto estão registradas do zero em `ADR.md`.

**Changelog:**
* v1.6 → Adiciona a **Fase 9 — Dashboard do progresso** (RN34–RN37, RNF11, ADR-020): mapa de calor de teclas (RN34), tendência de evolução por período (WPM/acurácia/latência, RN35), **MasteryProximityIndex** ([0,1] por tecla com pesos `w_accuracy=0.35`/`w_latency=0.25`/`w_streak=0.25`/`w_attempts=0.15` recomendados e validados — RN36) e fuso horário do usuário para agregação por dia calendário local (`UserProfile.timezone`, default `America/Sao_Paulo` — RN37). Parametriza `MPI_*`/`DAILY_*` em §26, adiciona RNF11 (produto, quantitativo: `p95 ≤ 500ms` para 1 ano de dados por semana, autocannon; resolução por agregação pré-computada — ADR-020) e adiciona FASE 9 a §30.
* v1.5 → Adiciona **RN33 — Pacing de prática** (ergonomia por tempo): bloco de 15 minutos de prática ativa acumulada → pausa mínima de 3 minutos antes de iniciar nova sessão; a lição em curso nunca é interrompida. Parametriza `PRACTICE_BLOCK_DURATION_MS`/`MIN_BREAK_DURATION_MS` em §26 e adiciona `BREAK_REQUIRED` ao catálogo §28.5.
* v1.4 → Auditoria de requisitos contra Sommerville (Cap. 6): adiciona §2.3 (Requisitos de Usuário, nível não técnico, obrigatórios "deve"/desejáveis "pode"); adiciona §27.1 (classificação de cada RN em funcional/não funcional/domínio, com prioridade, justificativa e fonte); reestrutura §28 em produto/organizacionais/externos com critérios verificáveis e adiciona §28.4 (conflitos conhecidos entre RNFs) — o catálogo de erros, antes §28.1, passa a §28.5; move as decisões de configuração (`BCRYPT_SALT_ROUNDS`, expirações JWT) para nota explícita em §13.3; parametriza os thresholds da RN22 (`MIN_SESSION_DURATION_MS`, `MIN_SESSION_CHARACTERS`) em §26; adiciona RNF09 (idioma, externo) e RNF10 (escopo externo pendente); e **alinha a Seção 26 ao estado entregue da Fase 3** (`JWT_EXPIRATION = 24h` substituído por `JWT_ACCESS_EXPIRATION = 15m` + `JWT_REFRESH_EXPIRATION = 30d`, conforme TASK-034a–d e ADR-013).
* v1.3 → Fecha as avaliações de escopo pendentes (TASK-067/TASK-068): `ADR-013` avalia OAuth/login social, recuperação de senha por e-mail e rate limiting de login (§13.4) — OAuth e recuperação mantidos fora de escopo com gatilhos de reabertura objetivos; rate limiting **aprovado** (implementação em `TASK-073`) com a entrada `TOO_MANY_REQUESTS` (429) adicionada ao catálogo da Seção 28.5. `ADR-014` avalia a migração SQLite→PostgreSQL — permanece SQLite, com gatilhos objetivos de migração.
* v1.2 → Adiciona RN23 (Fase 7/E2E): quando o usuário não possui teclas em pools selecionáveis de reforço (todas as teclas ainda `UNKNOWN`/`LEARNING`, pool com peso 0), a lição de reforço é gerada com as teclas praticadas — o endpoint `/me/reinforcement-lesson` nunca falha por falta de pool selecionável; o caso de teclas inexistentes (usuário sem nenhuma `KeyPerformance`) permanece `LESSON_NOT_FOUND` (não é atingido pelo motor).
* v1.1 → Resolve todas as pendências "A VALIDAR" via ADR-010: `BCRYPT_SALT_ROUNDS=12`, `JWT_EXPIRATION=24h` (interino, refresh tokens movidos para Fase 3), `MIN_PASSWORD_LENGTH=8` (sem complexidade, alinhado NIST 800-63B), `ACTIVE_DURATION_EPSILON_MS=1000`; adiciona RN22 (sessões < 3000ms ou < 5 chars → insufficient-data); RNF06 validado com `autocannon` + ambiente local; Fase 5 desbloqueada.
* v1.0 → Primeira versão deste repositório. Consolida o núcleo de domínio (sessão, métricas, WeakKeyScore, mastery, progressão, N-grams) já validado em rascunho anterior, e fecha as lacunas identificadas em revisão técnica: (a) adiciona Seção 13 — Autenticação e Autorização, ausente até então; (b) formaliza `FinalUncorrectedErrors = max(0, errors − correctedErrors)` (Seção 12), antes implícita; (c) formaliza `KeyAccuracy` por tecla (Seção 15), que o critério de mastery usava sem definição própria; (d) define regra de desempate determinística no método do maior resto do arredondamento dos pools (Seção 25); (e) define semântica exata dos contadores `consecutiveMasterySessions`/`regressionSessions` (Seção 19); (f) define o ambiente de referência do RNF06.

---

## 1. Visão Geral

O **OpenType Tutor** é um serviço backend de treinamento de digitação baseado em prática adaptativa, exposto como API REST.

O sistema acompanha o desempenho individual do usuário durante sessões de digitação, identifica dificuldades específicas por tecla, calcula métricas de desempenho e adapta automaticamente as próximas atividades.

Responsabilidades do backend:

* autenticação e gerenciamento de usuários;
* configuração de layout de teclado;
* gerenciamento de lições;
* gerenciamento do ciclo de vida das sessões;
* processamento de eventos de digitação;
* cálculo de métricas;
* avaliação de desempenho por tecla;
* identificação de teclas que necessitam de reforço;
* geração de lições adaptativas;
* progressão curricular;
* persistência dos dados;
* exposição de API REST.

Princípio central do produto:

> **O sistema deve adaptar o treinamento com base no desempenho observado, e não apenas no nível declarado pelo usuário.**

Este documento define **o quê** o sistema faz e **por quê**. Decisões de biblioteca, framework e infraestrutura concreta pertencem a `ADR.md`. Princípios permanentes de como construir (TDD, SDD, boundaries) pertencem a `CONSTITUTION.md`.

---

## 1.1 Idioma do Produto

O idioma oficial do produto é **Português do Brasil (pt-BR)**. Todas as interfaces de usuário, mensagens de erro, documentação voltada ao usuário final, e-mails transacionais e comunicações do sistema devem ser em português do Brasil.

---

## 2. Objetivos do Produto

### 2.1 Objetivo principal

Desenvolver um tutor de digitação capaz de identificar dificuldades motoras e adaptar o treinamento de acordo com o desempenho real do usuário, exposto como serviço multiusuário seguro.

### 2.2 Objetivos específicos

O sistema deve:

1. autenticar usuários e isolar os dados de cada um;
2. registrar sessões de digitação;
3. registrar eventos relevantes de teclado;
4. calcular velocidade e precisão;
5. identificar erros por tecla;
6. acompanhar latência;
7. calcular um índice de dificuldade por tecla;
8. determinar o estado de domínio de cada tecla;
9. selecionar teclas para reforço;
10. gerar exercícios usando padrões linguísticos reais;
11. manter a progressão curricular;
12. preservar a separação entre layouts de teclado;
13. permitir evolução futura sem acoplamento da regra de negócio à infraestrutura.

---

## 2.3 Requisitos de Usuário

Requisitos de usuário descrevem, em linguagem acessível a leitores não técnicos, os serviços que o sistema deve oferecer e restrições sob as quais opera — sem jargão de software, sem esquemas de dados e sem detalhes de implementação (Sommerville, §6.2). Cada requisito rastreia para os requisitos de sistema detalhados (Seções 9 a 27). Requisitos **obrigatórios** usam "deve"; requisitos **desejáveis** (não essenciais nesta versão) usam "pode".

### 2.3.1 Obrigatórios (deve)

1. O sistema **deve** permitir que o usuário se cadastre com e-mail e senha e faça login com essas credenciais.
2. O sistema **deve** manter os dados de cada usuário isolados dos demais — nenhum usuário pode acessar ou modificar dados de outro.
3. O sistema **deve** permitir que o usuário escolha o layout de teclado (ABNT2 ou US-INTERNATIONAL) usado em seu treinamento.
4. O sistema **deve** registrar sessões de digitação e os eventos de teclado relevantes durante todo o seu ciclo de vida (iniciar, pausar, retomar, abandonar, concluir).
5. O sistema **deve** calcular, ao final de cada sessão concluída, métricas de velocidade (WPM), precisão, tempo ativo e latência média.
6. O sistema **deve** identificar, para cada tecla, o nível de desempenho do usuário ao longo do tempo (acurácia, latência, critério de domínio).
7. O sistema **deve** gerar lições de reforço com as teclas em que o usuário apresenta mais dificuldade, usando padrões linguísticos reais de português brasileiro e respeitando o layout ativo.
8. O sistema **deve** manter uma progressão curricular: o usuário conclui lições, avança de nível e recebe a próxima lição compatível com seu nível.
9. O sistema **deve** impedir acesso a recursos de outros usuários (resposta de autorização) e exigir autenticação em todos os endpoints protegidos.
10. O sistema **deve** devolver sessões com dados insuficientes (muito curtas ou com poucos caracteres) sem métricas de desempenho calculadas.
11. O sistema **deve** enviar respostas em formato JSON e erros em formato padronizado com código e mensagem (mensagens em pt-BR).
12. O sistema **deve** permitir que o usuário limpe o próprio progresso para recomeçar o curso do zero (sessões, métricas por tecla, cartão de progresso e progresso curricular), mantendo a conta e o layout de teclado.
13. O sistema **deve** exibir ao usuário um painel consolidado do próprio progresso: evolução de velocidade (PPM), precisão e latência ao longo do tempo, um mapa de calor das teclas praticadas, a proximidade de cada tecla à maestria e o fuso horário correto do dia calendário.

### 2.3.2 Desejáveis (pode) — fora do escopo desta versão

1. O sistema **pode** oferecer login por provedores sociais (OAuth) — avaliado no ADR-013, mantido fora de escopo com gatilhos de reabertura.
2. O sistema **pode** oferecer recuperação de senha por e-mail — avaliado no ADR-013, mantido fora de escopo com gatilhos de reabertura.
3. O sistema **pode** limitar tentativas de login por IP — **aprovado** (rate limiting, TASK-073).

---

## 3. Princípios Arquiteturais

Clean Architecture, com DDD e SOLID.

### 3.1 Regra de dependência

```text
Presentation
     ↓
Application
     ↓
Domain
```

```text
Infrastructure → interfaces → Domain/Application
```

O domínio **não pode importar**: Express, TypeORM, SQLite, `jsonwebtoken`, `bcrypt`, Zod, bibliotecas HTTP, controllers, repositories concretos, ou qualquer detalhe de infraestrutura. Autenticação (verificação de token, hashing de senha) é implementada em `infrastructure/`/`presentation/` e exposta ao domínio apenas como o `userId` já autenticado — o domínio nunca vê senha, token ou header HTTP.

---

## 4. Estrutura do Projeto

```text
src/
├── domain/
│   ├── config/
│   │   └── adaptiveParams.ts
│   │
│   ├── entities/
│   │   ├── User.ts
│   │   ├── UserProfile.ts
│   │   ├── Lesson.ts
│   │   ├── TypingSession.ts
│   │   ├── KeyPerformance.ts
│   │   └── Progress.ts
│   │
│   ├── value-objects/
│   │   ├── Email.ts
│   │   ├── Layout.ts
│   │   └── SessionId.ts
│   │
│   ├── services/
│   │   ├── MetricsEngine.ts
│   │   ├── AdaptiveLessonEngine.ts
│   │   └── ProgressionEngine.ts
│   │
│   ├── repositories/
│   │   ├── IUserRepository.ts
│   │   ├── ILessonRepository.ts
│   │   ├── ITypingSessionRepository.ts
│   │   ├── IKeyPerformanceRepository.ts
│   │   ├── IProgressRepository.ts
│   │   └── INGramRepository.ts
│   │
│   └── errors/
│
├── application/
│   ├── use-cases/
│   └── dtos/
│
├── infrastructure/
│   ├── database/
│   ├── typeorm/
│   ├── repositories/
│   ├── auth/              # hashing (bcrypt) e emissão/verificação de JWT
│   └── logger/
│
├── presentation/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   │   └── authMiddleware.ts
│   └── validators/
│
└── shared/
    ├── errors/
    └── utils/
```

---

## 5. Conceitos Fundamentais do Domínio

```text
Credenciais
   ↓
AuthService (infra) → userId autenticado
   ↓
Sessão
   ↓
Eventos de teclado
   ↓
MetricsEngine
   ↓
KeyPerformance
   ↓
AdaptiveLessonEngine
   ↓
Lição de reforço

Progress
   ↓
ProgressionEngine
   ↓
Próxima lição curricular
```

Três mecanismos independentes:

* **Autenticação** responde: "quem está fazendo esta requisição?"
* **Adaptação** responde: "quais teclas o usuário precisa praticar?"
* **Progressão** responde: "em qual ponto do currículo o usuário está?"

---

## 6. User

```text
id: UUID
name: string
email: Email
passwordHash: string
createdAt: Date
```

### Regras

* `id` é UUID.
* `email` é único, representado por Value Object.
* `passwordHash` nunca é exposto em nenhuma resposta de API, log, ou DTO de saída — é um detalhe interno da entidade, usado apenas pelo `infrastructure/auth` para comparação no login.
* `createdAt` é definido na criação.

---

## 7. UserProfile

```text
userId: UUID
activeLayout: Layout
currentLevel: number
```

### Layouts suportados

```text
ABNT2
US-INTERNATIONAL
```

O layout ativo é usado para interpretar eventos de teclado e selecionar conteúdo compatível.

---

## 8. Lesson

```text
id: UUID
level: number
title: string
content: string
targetKeys: string[]
difficulty: GUIDED | REINFORCEMENT | FREE
type: INTRODUCTION | PRACTICE | REINFORCEMENT | ASSESSMENT
layout: Layout
```

* **INTRODUCTION** — apresenta novas teclas ou padrões.
* **PRACTICE** — consolida conteúdo já introduzido.
* **REINFORCEMENT** — trabalha dificuldades identificadas pelo mecanismo adaptativo.
* **ASSESSMENT** — avalia desempenho sem necessariamente introduzir conteúdo novo.

---

## 9. TypingSession

```text
id: UUID
userId: UUID
lessonId: UUID
layout: Layout
state: SessionState
startedAt: Date
completedAt: Date | null
activeDurationMs: number
metrics: SessionMetrics | null
keystrokes: KeystrokeEvent[]
```

### 9.1 Estados

```text
IDLE
RUNNING
PAUSED
COMPLETED
ABANDONED
```

### 9.2 Transições válidas

```text
IDLE → RUNNING
RUNNING → PAUSED
RUNNING → ABANDONED
RUNNING → COMPLETED
PAUSED → RUNNING
PAUSED → ABANDONED
PAUSED → COMPLETED
```

Transições inválidas resultam em erro de domínio (`INVALID_SESSION_TRANSITION`).

Toda operação sobre uma `TypingSession` (pause/resume/abandon/submit) exige que o `userId` autenticado seja o dono da sessão — caso contrário, erro `SESSION_NOT_OWNED` (ver Seção 13).

---

## 10. Tempo Ativo da Sessão

```text
ActiveDuration = tempo total da sessão − tempo acumulado em pausa
ActiveDurationMinutes = max(activeDurationMs / 60000, ε)
```

`ε` é um valor mínimo definido em `adaptiveParams.ts`, evitando divisão por zero.

---

## 11. KeystrokeEvent

```text
expectedKey: string
typedKey: string | null
physicalKey: string
logicalKey: string
eventType: EventType
timestampMs: number
latencyMs: number | null
composedCharacter: string | null
```

### 11.1 EventType

```text
CORRECT
INCORRECT
CORRECTION
DEAD_KEY_COMPOSE
```

Eventos de controle (`SHIFT`, `CTRL`, `ALT`, `DELETE`, `TAB`, `CAPSLOCK`) não são tratados como caracteres digitados para cálculo de WPM.

### 11.2 physicalKey vs. logicalKey vs. expectedCharacter

* **physicalKey** — posição física pressionada (ex.: `KeyA`).
* **logicalKey** — tecla lógica segundo o layout ativo (ex.: `A`).
* **expectedCharacter** — caractere esperado pelo exercício.

Essa separação é necessária para suportar corretamente layouts diferentes.

### 11.3 Dead Keys

O layout `US-INTERNATIONAL` compõe caracteres (ex.: `' + a → á`). O sistema preserva `physicalKey`, `logicalKey` e `composedCharacter` de cada tecla da sequência, mas avalia o desempenho contra o **caractere final esperado** (`expectedCharacter = á`).

* A sequência de composição é registrada para telemetria, mas **não gera múltiplos erros artificiais** para um único caractere final.
* A `latencyMs` do caractere composto é medida do instante em que o **primeiro** evento da sequência de composição (`DEAD_KEY_COMPOSE`) foi apresentado ao usuário até o keydown que **finaliza** a composição — não da tecla morta isolada. Isso mantém a latência comparável à de um caractere simples digitado em uma única tecla.

---

## 12. SessionMetrics

```text
charactersTyped: number
correctCharacters: number
incorrectCharacters: number
correctedErrors: number
finalUncorrectedErrors: number
accuracy: number
grossWpm: number
netWpm: number
activeDurationMs: number
averageLatencyMs: number
```

**Fórmula de `finalUncorrectedErrors` (antes implícita, agora explícita):**

```text
FinalUncorrectedErrors = max(0, TotalErrors − CorrectedErrors)
```

Onde `TotalErrors` é a contagem de eventos `INCORRECT` da sessão (Seção 14) e `CorrectedErrors` é a contagem de eventos `CORRECTION` da sessão (Seção 14.2). O `max(0, ...)` protege contra qualquer inconsistência de contagem (ex.: correção sem erro correspondente registrado) — nesse caso o erro não corrigido nunca é negativo.

---

## 13. Autenticação e Autorização

Seção nova nesta versão — ausente no rascunho anterior, e requisito funcional obrigatório a partir do momento em que dados de múltiplos usuários passam a ser persistidos em um servidor compartilhado.

### 13.1 Estratégia (ADR-004)

* Senhas nunca são armazenadas em texto puro — apenas `passwordHash` (bcrypt).
* Autenticação é stateless via **JWT** (Bearer token), assinado pelo servidor.
* O token carrega `userId` como claim principal; nenhuma outra informação sensível.
* Todo endpoint, exceto `POST /auth/register` e `POST /auth/login`, exige um header `Authorization: Bearer <token>` válido.
* O `userId` usado em qualquer operação (sessão, progresso, perfil) é **sempre** extraído do token verificado pelo `authMiddleware` — nunca de parâmetro de rota, query string ou corpo da requisição. Um `userId` no corpo da requisição, se presente, é ignorado ou rejeitado (nunca usado como fonte de verdade), prevenindo que um usuário autenticado manipule dados de outro.

### 13.2 Endpoints

```http
POST /auth/register   { name, email, password } → 201 { userId }
POST /auth/login       { email, password } → 200 { token }
```

### 13.3 Regras

* `RN16` — Toda requisição a um endpoint protegido sem token válido retorna `401 UNAUTHORIZED`.
* `RN17` — Toda requisição a um recurso pertencente a outro usuário (`userId` do token ≠ dono do recurso) retorna `403 FORBIDDEN` (`SESSION_NOT_OWNED`, `PROFILE_NOT_OWNED`, etc., conforme o recurso).
* `RN18` — Senhas são validadas com política mínima definida em `infrastructure/auth/authParams.ts` (`MIN_PASSWORD_LENGTH = 8`) antes do hashing (Seção 26, ADR-010).
* **Decisão de configuração (não função):** o custo do bcrypt (`BCRYPT_SALT_ROUNDS = 12`) e as expirações do JWT (`JWT_ACCESS_EXPIRATION = 15m`, `JWT_REFRESH_EXPIRATION = 30d`, com rotação/revogação — Fase 3, ADR-010 e ADR-013 §13.4) são **parâmetros de configuração** centralizados em `infrastructure/auth/authParams.ts`, nunca hardcoded na lógica — não são requisitos funcionais; documentados em ADR-010 e Seção 26.

### 13.4 Fora de escopo desta versão

OAuth/login social e recuperação de senha por e-mail são reconhecidos como necessários para produção, mas permanecem fora do escopo desta versão — ver `ADR-013` para a avaliação formal e os gatilhos objetivos de reabertura. O rate limiting de tentativas de login foi avaliado no `ADR-013` e **aprovado para implementação** (`TASK-073`), retornando `429 TOO_MANY_REQUESTS` conforme o catálogo da Seção 28.5 com parâmetros centralizados em `infrastructure/auth/rateLimitParams.ts`. Os refresh tokens, outrora listados aqui, foram movidos para a Fase 3 pelo `ADR-010` (access token curto + refresh token com rotação) e já estão implementados (TASK-034a–d).

---

## 14. MetricsEngine

Responsável exclusivamente pelo cálculo das métricas da sessão. Não conhece banco de dados, HTTP, TypeORM, Express, controllers ou autenticação.

### 14.1 Cálculo de Caracteres

Somente eventos que representam caracteres efetivamente processados entram em `charactersTyped`. Eventos de controle não incrementam a contagem.

### 14.2 Backspace e Correções

* **INCORRECT** — `attempts += 1; errors += 1` (na `KeyPerformance` da tecla). O erro permanece potencialmente não corrigido até o cálculo final da sessão.
* **CORRECTION** — `correctedErrors += 1`. Não incrementa `errors` novamente.

```text
INCORRECT → erro
BACKSPACE → correção do erro existente
```
nunca:
```text
INCORRECT → erro
BACKSPACE → segundo erro
```

---

## 15. Gross WPM, Net WPM, Accuracy, Latência

```text
GrossWPM = (CharactersTyped / 5) / ActiveDurationMinutes

NetWPM = max(0, GrossWPM − FinalUncorrectedErrors / ActiveDurationMinutes)

Accuracy = CorrectCharacters / CharactersTyped     (0 quando CharactersTyped = 0)

AverageLatency = sum(validLatency) / count(validLatency)     (0 quando não há eventos válidos)
```

`validLatency` considera apenas eventos `CORRECT` e `INCORRECT` — eventos de controle e de correção não entram no cálculo.

---

## 16. KeyPerformance

```text
id: UUID
userId: UUID
logicalKey: string
layout: Layout
attempts: number
errors: number
averageLatencyMs: number
lastPracticedAt: Date | null
consecutiveMasterySessions: number
regressionSessions: number
masteryState: MasteryState
```

Chave de identidade: `(userId, logicalKey, layout)` — impede que o desempenho de `ABNT2` seja misturado com `US-INTERNATIONAL`.

### 16.1 ErrorRate

```text
ErrorRate = errors / attempts     (0 quando attempts = 0)
```

### 16.2 KeyAccuracy (nova nesta versão — usada pelo critério de mastery, Seção 18)

```text
KeyAccuracy = 1 − ErrorRate
```

`KeyAccuracy` só é avaliada pelo critério de mastery quando `attempts ≥ 30` (Seção 18) — nesse ponto `attempts` nunca é `0`, então o caso `ErrorRate = 0 ⇒ KeyAccuracy = 1` por ausência de dados nunca alcança a avaliação de mastery na prática (a tecla estaria em `UNKNOWN`, Seção 21, antes disso).

### 16.3 LatencyScore

```text
LatencyScore = min(1, AverageLatencyMs / 500)
```

### 16.4 RecencyScore

```text
RecencyScore(t) = 1 − e^(−λt),  λ = 0.1,  t = dias desde a última sessão válida contendo a tecla
```

Se a tecla nunca foi praticada: `RecencyScore = 1`.

### 16.5 WeakKeyScore

```text
WeakKeyScore = 0.50 × ErrorRate + 0.30 × LatencyScore + 0.20 × RecencyScore
```

Pesos centralizados em `domain/config/adaptiveParams.ts`.

---

## 17. Estados de Domínio

```text
UNKNOWN → LEARNING / CONSOLIDATING / WEAK → MASTERED
                                    ↑___________|
                                     (regressão)
```

Valores: `UNKNOWN`, `LEARNING`, `CONSOLIDATING`, `MASTERED`, `WEAK`.

---

## 18. Regra de Mastery

Uma tecla atinge `MASTERED` quando cumpre, simultaneamente:

```text
KeyAccuracy ≥ 95%
E attempts ≥ 30
E averageLatencyMs ≤ 500
```

satisfeitos em **3 sessões consecutivas**.

### 18.1 Mastery-Approved Session

Uma sessão é aprovada para efeito de mastery de uma tecla quando, ao final daquela sessão, o estado cumulativo da `KeyPerformance` da tecla satisfaz:

```text
KeyAccuracy ≥ 0.95  E  averageLatencyMs ≤ 500
```

`attempts ≥ 30` é cumulativo para o histórico da tecla — não precisa ser satisfeito de novo em cada sessão individual, apenas estar satisfeito no momento da avaliação.

### 18.2 Transição para MASTERED

Uma tecla ainda não `MASTERED` atinge `MASTERED` quando possuir `attempts ≥ 30` **e** 3 mastery-approved sessions consecutivas.

---

## 19. Regressão de MASTERED e semântica dos contadores

Uma tecla `MASTERED` não perde o domínio por uma única sessão ruim. Entra em regressão após **3 sessões consecutivas** que deixem de satisfazer os critérios de mastery-approved. Após a terceira, `MASTERED → estado determinado pelo WeakKeyScore` (Seção 20).

**Semântica exata dos dois contadores de `KeyPerformance` (nova nesta versão):**

| Contador | Incrementa quando... | Reseta para 0 quando... |
|---|---|---|
| `consecutiveMasterySessions` | tecla ainda não `MASTERED` termina uma sessão mastery-approved | a sessão não é mastery-approved (qualquer sessão não aprovada zera a sequência) |
| `regressionSessions` | tecla já `MASTERED` termina uma sessão **não** mastery-approved | a tecla registra qualquer sessão mastery-approved enquanto ainda `MASTERED` |

Os dois contadores nunca incrementam ao mesmo tempo: `consecutiveMasterySessions` só é relevante enquanto o estado ainda não é `MASTERED`; `regressionSessions` só é relevante enquanto o estado já é `MASTERED`. Ao promover para `MASTERED`, `consecutiveMasterySessions` é zerado e passa a não ser mais incrementado até uma eventual regressão.

---

## 20. Classificação por WeakKeyScore

Aplicável a teclas não-`MASTERED` (ou recém-regredidas de `MASTERED`):

```text
WeakKeyScore ≥ 0.70        → WEAK
0.40 ≤ WeakKeyScore < 0.70  → CONSOLIDATING
WeakKeyScore < 0.40         → LEARNING
```

---

## 21. Estado UNKNOWN

```text
attempts < 5 → UNKNOWN
```

Evita conclusões prematuras com poucas observações. Teclas `UNKNOWN` não são selecionadas para reforço.

---

## 22. Progress

```text
id: UUID
userId: UUID
currentLessonId: UUID | null
currentLevel: number
completedLessons: number
lastCompletedAt: Date | null
```

`KeyPerformance` responde "como está o desempenho dessa tecla?"; `Progress` responde "onde o usuário está no currículo?". Não devem ser fundidos (Seção 27.1).

---

## 23. ProgressionEngine

Controla a progressão normal entre lições: determina conclusão, avanço de nível, seleciona a próxima lição curricular, impede avanço indevido, respeita o layout ativo, e diferencia progressão normal de reforço adaptativo. O mecanismo adaptativo não substitui automaticamente o currículo inteiro (Seção 27.2).

---

## 24. AdaptiveLessonEngine

```text
KeyPerformance → WeakKeyScore → MasteryState → Reinforcement Pools → Seleção de teclas → N-Grams → Lesson
```

### 24.1 Pools de Reforço

| Pool | Estados | Peso |
|---|---|---|
| WEAK | `WEAK`, `LEARNING` | 60% |
| CONSOLIDATING | `CONSOLIDATING` | 25% |
| MASTERED | `MASTERED` | 15% |
| — | `UNKNOWN` | 0% (excluída) |

### 24.2 Redistribuição

Se um pool estiver vazio, sua participação é redistribuída proporcionalmente entre os pools disponíveis. A soma final é sempre 100%.

### 24.3 Tamanho da lição adaptativa

Alvo padrão: `N = 150` caracteres (`REINFORCEMENT_TARGET_CHARACTERS`, configurável). O resultado deve ter exatamente ou o mais próximo possível de `N`, sem sequências artificialmente repetitivas.

### 24.4 Fallback sem pool selecionável

```text
RN23 — Se nenhuma tecla estiver nos pools com peso > 0 (WEAK, CONSOLIDATING, MASTERED) — situação típica
de um usuário novo, cujas teclas ainda estão UNKNOWN (< 5 tentativas) ou LEARNING (peso 0) — a lição de
reforço é gerada com as teclas praticadas, ordenadas por frequência de N-gram no layout ativo.
O motor sempre produz uma lição válida; usuário sem nenhuma KeyPerformance não chega ao motor
(Use Case responde LESSON_NOT_FOUND antes) e continua retornando 404.
```

---

## 25. N-Grams e Arredondamento dos Pools

O conteúdo de reforço usa padrões linguísticos reais de português brasileiro, via `INGramRepository`:

```typescript
getPatterns(
  layout: Layout,
  targetKeys: string[],
  minimumLength: number
): Promise<string[]>
```

A origem concreta (banco, arquivo, corpus, serviço externo) não pertence ao domínio (ADR-007).

Regras de seleção: priorizar padrões com teclas fracas; respeitar o layout; evitar repetição excessiva; manter plausibilidade linguística; aproximar do tamanho alvo; evitar sequências aleatórias sem valor pedagógico.

**Arredondamento (método do maior resto) e regra de desempate — antes indefinida, agora explícita:**

Para `N = 150` e pesos 60/25/15: parte inteira de cada pool é `floor(N × peso)` → `WEAK = 90`, `CONSOLIDATING = 37`, `MASTERED = 22`, soma parcial `149`. A(s) unidade(s) restante(s) (`150 − 149 = 1`) vai(vão) para o(s) pool(s) com maior resto fracionário.

```text
RN19 — Regra de desempate: se dois ou mais pools empatarem no maior resto fracionário,
a unidade extra vai para o pool de menor tolerância pedagógica, nesta ordem de prioridade:
WEAK > CONSOLIDATING > MASTERED.
```

No exemplo padrão (`N=150`), `CONSOLIDATING` (resto 0,5) e `MASTERED` (resto 0,5) empatam; pela RN19, a unidade extra vai para `CONSOLIDATING` (maior prioridade que `MASTERED`): resultado `WEAK = 90, CONSOLIDATING = 38, MASTERED = 22`, soma `150`.

---

## 26. Configuração de Parâmetros

Todos os parâmetros adaptativos e de segurança centralizados em `domain/config/adaptiveParams.ts` (os de auth podem viver em um módulo irmão em `infrastructure/auth/authParams.ts`, já que dependem de bibliotecas de infraestrutura — mas nunca hardcoded dentro da lógica):

```text
WEAK_POOL_WEIGHT = 0.60
CONSOLIDATING_POOL_WEIGHT = 0.25
MASTERED_POOL_WEIGHT = 0.15

MASTERY_ACCURACY = 0.95
MASTERY_ATTEMPTS = 30
MASTERY_LATENCY_MS = 500
MASTERY_CONSECUTIVE_SESSIONS = 3

UNKNOWN_ATTEMPTS = 5
LATENCY_REFERENCE_MS = 500
WEAK_THRESHOLD = 0.70
CONSOLIDATING_THRESHOLD = 0.40
RECENCY_LAMBDA = 0.1
REINFORCEMENT_TARGET_CHARACTERS = 150
ACTIVE_DURATION_EPSILON_MS = 1000

# RN32 — limiares de status visual por lição
LESSON_MASTERY_ACCURACY = 0.95
LESSON_REVIEW_ACCURACY = 0.60
LESSON_REVIEW_MIN_ATTEMPTS = 2

# Thresholds "insufficient-data" (RN22, parametrizados e nominais — nunca literais na lógica)
MIN_SESSION_DURATION_MS = 3000
MIN_SESSION_CHARACTERS = 5

# RN33 — pacing de prática (bloco de 15 min de prática ativa → pausa mínima de 3 min)
PRACTICE_BLOCK_DURATION_MS = 900000
MIN_BREAK_DURATION_MS = 180000

# RN35 — janelas de tendência do dashboard (períodos agregáveis, em dias)
DASHBOARD_TREND_WINDOWS_DAYS = [7, 30, 90]
DASHBOARD_HEATMAP_WINDOW_DAYS = 7

# RN36 — MasteryProximityIndex (pesos recomendados e validados — Bloco 0.5, ADR-020)
MPI_W_ACCURACY = 0.35
MPI_W_LATENCY  = 0.25
MPI_W_STREAK   = 0.25
MPI_W_ATTEMPTS = 0.15

# RN36 — faixas do índice para a UI (nunca cor sozinha — rótulo junto)
MPI_BAND_FAR_THRESHOLD = 0.20
MPI_BAND_CLOSE_THRESHOLD = 0.50
MPI_BAND_VERGE_THRESHOLD = 0.80

# infrastructure/auth/authParams.ts — VALIDADO (valores de segurança, não de produto)
BCRYPT_SALT_ROUNDS = 12
JWT_ACCESS_EXPIRATION = 15m
JWT_REFRESH_EXPIRATION = 30d
MIN_PASSWORD_LENGTH = 8
```

---

## 27. Regras de Negócio Consolidadas

| ID | Regra |
|---|---|
| RN01 | `GrossWPM = (CharactersTyped/5) / ActiveDurationMinutes` |
| RN02 | `NetWPM = max(0, GrossWPM − FinalUncorrectedErrors/ActiveDurationMinutes)` |
| RN03 | `Accuracy = CorrectCharacters / CharactersTyped` (0 se denominador 0) |
| RN04 | `WeakKeyScore = 0.50×ErrorRate + 0.30×LatencyScore + 0.20×RecencyScore` |
| RN05 | `ErrorRate = errors/attempts` (0 se `attempts=0`) |
| RN06 | `LatencyScore = min(1, AverageLatencyMs/500)` |
| RN07 | `RecencyScore = 1 − e^(−0.1t)` |
| RN08 | `attempts < 5 → UNKNOWN` |
| RN09 | `KeyAccuracy≥95% E attempts≥30 E averageLatency≤500ms` em 3 sessões consecutivas `→ MASTERED` |
| RN10 | Regressão de `MASTERED` só após 3 sessões consecutivas não aprovadas |
| RN11 | `KeyPerformance` isolado por `userId + logicalKey + layout` |
| RN12 | `CORRECTION` corrige um erro existente e não cria um novo erro |
| RN13 | Sessões `ABANDONED` não produzem atualização de desempenho nem progresso |
| RN14 | Submit de sessão `COMPLETED` é idempotente — não reprocessa |
| RN15 | Teclas `UNKNOWN` não entram nos pools adaptativos |
| RN16 | Endpoint protegido sem token válido → `401 UNAUTHORIZED` |
| RN17 | Acesso a recurso de outro usuário → `403 FORBIDDEN` |
| RN18 | Senha validada contra política mínima (`MIN_PASSWORD_LENGTH = 8`) antes do hashing |
| RN19 | Empate no maior resto do arredondamento de pools é resolvido pela prioridade `WEAK > CONSOLIDATING > MASTERED` |
| RN20 | `KeyAccuracy = 1 − ErrorRate` |
| RN21 | `FinalUncorrectedErrors = max(0, TotalErrors − CorrectedErrors)` |
| RN22 | Sessão com `activeDurationMs < 3000` OU `charactersTyped < 5` → `SessionMetrics = insufficient-data` (métricas nulas/flag, não WPM calculado) |
| RN23 | Sem teclas em pools de reforço com peso > 0 (todas `UNKNOWN`/`LEARNING`), a lição de reforço usa as teclas praticadas ordenadas por frequência de N-gram — o motor nunca falha por pool vazio (Seção 24.4) |
| RN24 | Check-in ergonômico obrigatório antes da primeira sessão: altura da cadeira, apoio lombar, monitor na altura dos olhos, apoio de pulsos | 
| RN25 | Progressão em 7 fases pedagógicas sequenciais: `ERGONOMICS_SETUP` → `HOME_ROW` → `UPPER_LOWER_ROWS` → `WORD_FIXATION` → `ACCENTUATION` → `LONG_TEXTS` → `NUMERIC_KEYPAD` |
| RN26 | Critério de avanço de lição: cumulativamente (a) backspaces atuais ≤ anteriores, (b) nenhum desconforto relatado, (c) aluno confirma não olhar teclado — se qualquer falhar, não avança |
| RN27 | Cartão de Progresso persistido entre sessões: data, fase, lição, teclas inseguras, desconforto, observação, contagens de backspace — copiável para continuidade |
| RN28 | Regra de segurança: ao relatar dor/formigamento/dormência, interromper IMEDIATAMENTE, orientar pausa/alongamento/hidratação, só retomar quando confirmar que passou — prioridade sobre qualquer meta |
| RN29 | Variação de exercício antes de repetição idêntica: se critério de avanço falhar, oferecer variação do mesmo exercício antes de repetir — repetição idêntica sem ajuste gera tédio sem progresso |
| RN30 | Fechamento de sessão obrigatório: resumo 2-3 linhas + emissão de Cartão de Progresso copiável + lembrete de pausa/alongamento |
| RN31 | Reset de progresso: usuário pode limpar todo o próprio progresso (sessões, `KeyPerformance`, Cartão de Progresso e `Progress`) e voltar ao nível 1, mantendo a conta (credenciais) e o `activeLayout` — recurso isolado por `userId` (posse) |
| RN32 | Status visual por lição: cada lição na lista recebe uma cor + ícone + rótulo baseado no desempenho do usuário — `MASTERED` (verde ✅) se `bestAccuracy ≥ 0,95`, `REVIEW` (vermelho ⚠) se `attempts ≥ 2` e `lastAccuracy < 0,60`, `PRACTICING` (âmbar 🔁) caso contrário, `NOT_STARTED` se sem tentativas; precedência: `Bloqueada` > `Próxima` > status visual — limiares em `LESSON_MASTERY_ACCURACY`, `LESSON_REVIEW_ACCURACY`, `LESSON_REVIEW_MIN_ATTEMPTS` (§26) |
| RN33 | Pacing de prática: prática ativa acumulada ≥ `PRACTICE_BLOCK_DURATION_MS` (15 min) em um bloco obriga uma pausa mínima de `MIN_BREAK_DURATION_MS` (3 min) antes de **criar** uma nova sessão; a lição em curso nunca é interrompida — se o bloco estourar durante uma lição, ela conclui normalmente e a pausa vale a partir da conclusão; sessões `ABANDONED` não acumulam; após a pausa completada, o acumulador do bloco zera (nova sequência 15:3); violação na criação de sessão → `BREAK_REQUIRED` (§28.5) |
| RN34 | Dashboard — mapa de calor de teclas: intensidade de prática por tecla do layout ativo nos últimos `DASHBOARD_HEATMAP_WINDOW_DAYS` (7) dias (contagem de acionamentos + dias ativos), agregada e isolada por `userId + layout`, exibida num teclado visual |
| RN35 | Dashboard — tendência de evolução: séries diárias de `netWpm`, precisão (%) e latência média (ms) por dia calendário local (RN37), agregadas num `DailyMetricsAggregate` pré-computado e consultáveis nas janelas `DASHBOARD_TREND_WINDOWS_DAYS` (7/30/90 dias) |
| RN36 | Dashboard — `MasteryProximityIndex`: score ∈ [0,1] por tecla medindo a distância ao envelope da regra de mastery (RN09) — `MPI = w_accuracy·min(1, keyAccuracy/MASTERY_ACCURACY) + w_latency·latTerm + w_streak·min(1, consecutiveMasterySessions/MASTERY_CONSECUTIVE_SESSIONS) + w_attempts·min(1, attempts/MASTERY_ATTEMPTS)` com `latTerm = 0` se `averageLatencyMs = 0` (senão `clamp(1 − averageLatencyMs/MASTERY_LATENCY_MS, 0, 1)`) e `Σw = 1`; MPI atinge 1,0 somente quando os 4 gates do RN09 estão todos satisfeitos; faixas para a UI: `longe` (<0,20), `em progresso` (0,20–0,50), `próximo` (0,50–0,80), `às vésperas` (≥0,80) — pesos e limiares em §26 (`MPI_*`) |
| RN37 | Dashboard — fuso horário do usuário: `UserProfile.timezone` (IANA, default `America/Sao_Paulo`) define o dia calendário local usado na agregação diária (RN35) e nos rótulos — usuários em qualquer fuso têm agregações e rótulos corretos independentemente do relógio do servidor (UTC) |

---

### 27.1 Classificação, Prioridade, Justificativa e Fonte

Cada RN é classificada conforme Sommerville §6.1: **F** (funcional — serviço que o sistema fornece), **NF** (não funcional — restrição/propriedade do sistema ou do processo), **D** (domínio — derivado do domínio de aplicação, digitador/latência). Prioridade: **Deve** (obrigatório nesta versão) ou **Pode** (desejável, adiável). Cada RN traz justificativa e fonte, permitindo reavaliar uma mudança sabendo por que a regra existe e de onde veio.

| ID | Tipo | Prioridade | Justificativa | Fonte |
|---|---|---|---|---|
| RN01 | F | Deve | WPM bruto é a métrica padrão de velocidade de digitação; base para NetWPM. | Protótipo/indústria; ADR-010 |
| RN02 | F | Deve | Penaliza erros não corrigidos: reflete velocidade "útil", não só bruta. | Protótipo/indústria |
| RN03 | F | Deve | Precisão global; guarda contra divisão por zero. | Protótipo/indústria |
| RN04 | F | Deve | Fraqueza da tecla é multivariada (erro, latência, recência); pesos em `adaptiveParams.ts`. | Protótipo; ADR-010 (§16.5) |
| RN05 | F | Deve | Taxa de erro é o insumo primário de `WeakKeyScore`. | Protótipo/indústria |
| RN06 | F | Deve | Normaliza latência em [0,1]; 500ms é referência de latência aceitável. | Protótipo; ADR-010 |
| RN07 | F | Deve | Decaimento exponencial modela esquecimento; tecla antiga pesa mais. | Protótipo; modelo de aprendizagem |
| RN08 | D | Deve | Poucas observações não suportam conclusão; evita classificação prematura. | Protótipo |
| RN09 | D | Deve | Domínio exige consistência (3 critérios em 3 sessões consecutivas), não um único acerto. | Protótipo; ADR-010 |
| RN10 | D | Deve | Evita perda de domínio por uma sessão ruim isolada. | Protótipo |
| RN11 | F | Deve | Desempenho é específico do par (tecla, layout); ABNT2 não se mistura com US-INTERNATIONAL. | Protótipo; ADR-012 |
| RN12 | F | Deve | Correção conserta o erro existente; não gera um segundo erro (anti-dupla penalidade). | Protótipo; PRD §14.2 |
| RN13 | F | Deve | Sessão abandonada não evidencia domínio; não deve afetar desempenho nem progressão. | Protótipo |
| RN14 | F | Deve | Retry HTTP não deve corromper métricas nem progresso (idempotência). | Revisão técnica; ADR-008 |
| RN15 | F | Deve | Tecla sem dados suficientes não entra em reforço. | ADR-007 |
| RN16 | NF | Deve | Segurança da API: rota protegida sem token é rejeitada. | PRD §13; ADR-004 |
| RN17 | NF | Deve | Segurança multiusuário: isolamento por `userId` (posse). | PRD §13; ADR-004 |
| RN18 | NF | Deve | Política mínima de senha (comprimento ≥ 8, sem complexidade forçada). | ADR-010; NIST 800-63B |
| RN19 | D | Deve | Desempate determinístico do arredondamento; prioridade pedagógica `WEAK > CONSOLIDATING > MASTERED`. | ADR-009; PRD §25 |
| RN20 | F | Deve | Define `KeyAccuracy` explicitamente (usada pelo mastery). | ADR-010 |
| RN21 | F | Deve | Erros finais não corrigidos; `max(0, …)` protege contra inconsistência de contagem. | ADR-010; PRD §12 |
| RN22 | NF | Deve | Evita WPM/accuracy sem sentido em sessões triviais (dados insuficientes → métricas nulas). | ADR-010 |
| RN23 | F | Deve | Motor de reforço nunca falha por pool vazio; garante lição válida para usuário novo. | PRD §24.4; revisão Fase 7 |
| RN24 | F | Deve | Check-in ergonômico previne LER/DORT; base para prática saudável. | Prompt Pedagógico §53-58; NR17 |
| RN25 | D | Deve | Fases pedagógicas estruturam aprendizagem progressiva (Repouso → Superior/Inferior → Palavras → Acentuação → Textos → Numérico). | Prompt Pedagógico §24; Curso-Digitacao.md |
| RN26 | D | Deve | Critério de avanço garante automatismo (não olhar teclado), precisão (menos backspaces) e saúde (sem dor) antes de progredir. | Prompt Pedagógico §39; Prompt §10-16 |
| RN27 | F | Deve | Cartão de Progresso garante continuidade entre sessões (conversa reiniciada) e rastreabilidade do progresso. | Prompt Pedagógico §43-50 |
| RN28 | NF | Deve | Segurança do usuário: dor = sinal de alerta, não obstáculo; prioridade máxima sobre progresso. | Prompt Pedagógico §10-16; NR17; ADR-011 |
| RN29 | D | Deve | Variação evita tédio e consolida aprendizagem motora; repetição idêntica sem ajuste não gera progresso. | Prompt Pedagógico §39; Andragogia |
| RN30 | F | Deve | Fechamento estruturado consolida aprendizagem, emite artefato de continuidade e reforça saúde. | Prompt Pedagógico §41-51 |
| RN31 | F | Deve | Recomeçar o curso é necessidade real pós-conclusão; manter conta e layout evita re-cadastro e perda de preferência. | Feedback de usuário; PRD §2.3.1 |
| RN32 | F | Deve | Feedback visual imediato melhora a motivação e permite ao usuário identificar rapidamente onde precisa focar. | UX; Andragogia; RN09/RN26 |
| RN33 | NF | Deve | Pausas preventivas por tempo reduzem fadiga, desconforto musculoesquelético e o risco de LER/DORT — a pausa de 3 min ativa circulação e melhora a concentração na retomada; bloquear apenas a criação de nova sessão (nunca interromper a lição ativa) preserva o fluxo de prática. | Prompt Pedagógico §10-16, §41-51; RN24/RN28; NR17 |
| RN34 | F | Deve | Painel de cadência por tecla dá visão instantânea de onde se pratica mais (e menos) — orienta o foco do treino no layout ativo. | Feedback de produto (Fase 9); ADR-020 |
| RN35 | F | Deve | Ver a evolução ao longo de janelas de tempo é o insumo central de motivação e meta-avaliação do treino (progresso perceptível). | Feedback de produto (Fase 9); ADR-020 |
| RN36 | D | Deve | "Distância à maestria" é um conceito de domínio — deriva dos mesmos gates do RN09 com pesos explícitos e testáveis; um índice único permite priorizar teclas de forma legível no dashboard. | ADR-020; RN04 (precedente de pesos); RN09 |
| RN37 | NF | Deve | Agregar por dia calendário usando o fuso do usuário (e não UTC do servidor) evita rótulos e contagens erradas de dia — consistência temporal por perfil. | Feedback de produto (Fase 9); ADR-020 |

Notas:
* RNs 1–7, 12–14, 20, 21, 23, 24, 27, 30, 31, 34, 35 são **funcionais**; RNs 8–10, 19, 25, 26, 29, 36 são de **domínio**; RNs 16–18, 22, 28 são **não funcionais** (segurança/dados).
* RN22: o *efeito funcional* (sessão insuficiente → métricas nulas) é acionado por *thresholds não funcionais* — os literais `3000ms` e `5 chars` são parâmetros nomeados (`MIN_SESSION_DURATION_MS`, `MIN_SESSION_CHARACTERS`), agora em §26, nunca inline.
* RN24–RN33 implementam a metodologia pedagógica do Prompt-Pedagogico.md (Andragogia, progressão em fases, critério de avanço rigoroso, Cartão de Progresso, regra de segurança, variação antes de repetição, fechamento de sessão), o requisito de reset de progresso (RN31, §2.3.1 item 12), o status visual por lição (RN32, feedback de UX) e o pacing de prática com pausas preventivas (RN33).
* RN34–RN37 (Fase 9) são a camada de **dashboard**: serviço de domínio novo (`DailyMetricsAggregate`, `MasteryProximityIndex`, `KeyMasteryTransition`) consumido por 3 rotas `GET /me/dashboard/*` — nenhuma agregação pesada por request (pré-computação, ADR-020) para atender a RNF11 (p95 ≤ 500ms em 1 ano de dados).

---

## 28. Requisitos Não Funcionais

Requisitos não funcionais especificam restrições sobre serviços/funções e propriedades emergentes do sistema (Sommerville §6.1.2), classificados em: **produto** (comportamento/configuração do próprio sistema), **organizacionais** (derivados de políticas e processo de desenvolvimento) e **externos** (legislação, padrões, interoperabilidade — Fig. 6.2). Devem ser expressos de forma **verificável** sempre que possível (Tabela 6.1, §6.1.2): uma meta vaga não pode ser testada, um requisito quantificado pode.

### 28.1 Requisitos Não Funcionais de Produto

* **RNF01 (API)** — respostas em JSON. *Verificável:* `Content-Type: application/json` em toda resposta; médida por teste de contrato/integração.
* **RNF02 (Erros)** — formato padronizado: `{ "error": { "code": "SESSION_ALREADY_COMPLETED", "message": "..." } }`. *Verificável:* schema fixo validado por teste de integração para todo erro.
* **RNF06 (Performance) — quantitativo, validado** — `p95 ≤ 150ms` no endpoint de submit para payloads de até 1500 eventos. **Ambiente de referência (validado):** ferramenta `autocannon` (lib Node/TS, `npm run bench`), executado localmente em máquina de desenvolvimento documentada (CPU, RAM, OS), SQLite em arquivo (não em memória), banco pré-populado com histórico realista de pelo menos 500 sessões do usuário de teste, sem cache externo. Não requer CI — baseline comparável ao longo do tempo no mesmo ambiente local. *Nota cena A (TASK-080, 2026-09-15):* medida também pelo caminho da UI Next em produção (`npm run bench:cena-a`). O submit assíncrono de um usuário real (sessão nova, 1500 eventos, via `/api`) fica **dentro** do budget (p95 ~45ms frio, ~12ms médio). O mesmo autocannon de 10 conexões **através do rewrite `/api` do Next** não atende o p95 (≈4,8s; gargalo do proxy Next sob carga concorrente — o acesso direto ao backend na mesma máquina permanece ≈40ms). RNF06 da API continua medido no endpoint; o follow-up do proxy concorrente está registrado no BACKLOG (TASK-080).
* **RNF07 (Testabilidade)** — serviços de domínio testáveis sem banco, HTTP, filesystem ou TypeORM. *Verificável:* suíte de domínio roda com `npm run test` sem infraestrutura externa.
* **RNF08 (Segurança — nova)** — nenhuma senha em texto puro é logada, persistida ou retornada em qualquer resposta de API; tokens JWT não são logados integralmente (apenas os primeiros caracteres, se necessário para depuração). *Verificável:* auditoria de logs (busca por formas de senha) e teste de integração que garante ausência de `passwordHash` em respostas.
* **RNF11 (Performance do Dashboard) — quantitativo** — os endpoints `GET /me/dashboard/*` devem responder com `p95 ≤ 500ms` sob o **pior caso alvo**: 1 ano de atividade por semana (≈52 `DailyMetricsAggregate`s) por usuário. **Ambiente de referência:** mesmo do RNF06 (`autocannon`, máquina local documentada, SQLite em arquivo). **Mecanismo:** agregação **pré-computada** (`DailyMetricsAggregate` persistido por dia; `submit` mantém o agregado — nunca agrega sessões por request) e leitura transversal totalizando somas de contadores por janela (ADR-020). *Verificável:* `npm run bench:dashboard` com seed de 52 semanas; veredito em `bench/`. Requisito derivado de produto para a Fase 9.

### 28.2 Requisitos Não Funcionais Organizacionais

* **RNF03 (Arquitetura)** — regra de negócio independente de infraestrutura (Clean Architecture, ADR-003). *Verificável:* lint de boundaries e testes de domínio sem dependências externas (RNF07).
* **RNF04 (DI)** — dependências externas fornecidas por interfaces (ADR-005). *Verificável:* lint de boundaries (camadas importam apenas a direção permitida).
* **RNF05 (Configuração)** — parâmetros adaptativos e de segurança centralizados (Seção 26), nunca hardcoded. *Verificável:* revisão/grep por literais de segurança fora de `adaptiveParams.ts`/`authParams.ts`; ADR-006.

### 28.3 Requisitos Não Funcionais Externos

* **RNF09 (Idioma — externo/regulatório)** — produto, mensagens de erro e conteúdos em pt-BR (Seção 1.1, ADR-011); catálogo de erros único (§28.5). *Verificável:* revisão de conteúdo; mapa de erro pt-BR do Zod (TASK-070).
* **RNF10 (Escopo externo pendente — OAuth, recuperação de senha)** — reconhecidos como necessários para produção, mantidos fora de escopo nesta versão com gatilhos objetivos (ADR-013). *Verificável (gatilho):* N/A até serem implementados.

### 28.4 Conflitos Conhecidos entre Requisitos Não Funcionais

Requisitos não funcionais frequentemente entram em conflito (Sommerville §6.1.2). Conflitos identificados e sua resolução:

* **RNF01 (JSON) × RNF06 (Performance)** — serialização JSON tem custo; payloads de até 1500 eventos podem tensionar o p95 de 150ms. *Resolução:* JSON é obrigatório por contrato; o limite de 1500 eventos foi dimensionado com espaço para constar no budget do p95.
* **RNF06 (Performance) × RNF08 (Segurança/log)** — logar demasiado (tokens, senhas) tem custo e risco; omitir logging dificulta auditoria. *Resolução:* nunca logar senha; JWT apenas prefixado.
* **RNF02 (Formato único de erro) × RNF06 (Performance)** — padronização adiciona overhead de formatação em cada erro. *Resolução:* aceito; formato é barato e pré-computado no catálogo (§28.5).
* **RNF03/07 (Independência de infra) × RNF06 (Performance)** — isolar domínio da infraestrutura pode adicionar indireção; performance é medida contra baseline local documentado. *Resolução:* indireção de portas é desprezível no budget; RNF06 mede o resultado agregado.
* **RNF06 (Performance submit) × RNF11 (Performance dashboard)** — ambos leem/escrevem o mesmo SQLite; o agregado diário é mantido **no caminho do submit**. *Resolução:* o `submit` ganha apenas 1 WRITE (upsert) por sessão `COMPLETED` pela primeira vez (RN14 não duplica) — mesmo custo de magnitude de RN33 (`practice_pacing`); o orçamento do p95 (150ms) não é tensionado. Verificado no `bench:dashboard` para RNF11 e revalidado no `bench` (RNF06) na TASK-100.

### 28.5 Catálogo de Erros

Todo erro retornado segue o formato padronizado da **RNF02**. `code` e chaves estruturadas permanecem em inglês; `message` é sempre em pt-BR (ADR-011). Este catálogo é a **fonte única** das mensagens de erro — referenciado pela camada de apresentação via `shared/errors/ERROR_CODES.ts` (TASK-071), nunca inline em controllers (TASK-072).

| `code` | statusCode | `message` (pt-BR) |
|---|---|---|
| `INTERNAL` | 500 | Erro interno do servidor |
| `NOT_FOUND` | 404 | Rota não encontrada |
| `VALIDATION_ERROR` | 422 | Dados inválidos |
| `UNAUTHORIZED` | 401 | Token de acesso não fornecido ou inválido |
| `INVALID_TOKEN` | 401 | Token de acesso inválido |
| `TOKEN_EXPIRED` | 401 | Token de acesso expirado |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token inválido ou revogado |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token expirado |
| `INVALID_SESSION_TRANSITION` | 400 | Transição de estado inválida para a sessão |
| `SESSION_NOT_OWNED` | 403 | Sessão não pertence ao usuário autenticado |
| `PROFILE_NOT_OWNED` | 403 | Perfil não pertence ao usuário autenticado |
| `INSUFFICIENT_SESSION_DATA` | 422 | Sessão sem dados suficientes para cálculo de métricas |
| `USER_ALREADY_EXISTS` | 409 | Usuário com este email já existe |
| `INVALID_CREDENTIALS` | 401 | Credenciais inválidas |
| `LESSON_NOT_FOUND` | 404 | Lição não encontrada |
| `USER_NOT_FOUND` | 404 | Usuário não encontrado |
| `SESSION_NOT_FOUND` | 404 | Sessão não encontrada |
| `SESSION_ALREADY_COMPLETED` | 409 | Sessão já completada |
| `TOO_MANY_REQUESTS` | 429 | Muitas tentativas de login. Tente novamente mais tarde |
| `BREAK_REQUIRED` | 409 | Hora de descansar: faça uma pausa de pelo menos 3 minutos (alongue os braços, beba água e mexa as pernas) antes de iniciar a próxima lição |

Mensagens de validação de campos (Zod) são geradas pelo mapa de erro pt-BR (TASK-070) e devolvidas como detalhe (`details.issues`) do `VALIDATION_ERROR`, cada uma com `path`, `code` e `message`.

---

## 29. Estratégia de Testes

Antes da infraestrutura, o domínio deve possuir testes automatizados.

* **MetricsEngine** — Gross WPM, Net WPM, Accuracy, tempo ativo, pausa, latência, zero eventos, erros corrigidos, erros não corrigidos, eventos de controle, `FinalUncorrectedErrors` (incluindo o caso `correctedErrors > errors`, que deve saturar em 0, não ficar negativo).
* **KeyPerformance** — attempts, errors, ErrorRate, KeyAccuracy, LatencyScore, RecencyScore, WeakKeyScore, UNKNOWN, LEARNING, CONSOLIDATING, MASTERED, regressão, semântica dos dois contadores (Seção 19).
* **AdaptiveLessonEngine** — distribuição 60/25/15, pool vazio, redistribuição, arredondamento, **desempate determinístico (RN19)**, exclusão de UNKNOWN, seleção de teclas fracas, tamanho aproximado de 150 caracteres, uso de N-grams, isolamento por layout.
* **TypingSession** — transições válidas/inválidas, pause, resume, abandon, submit, submit duplicado, operação por usuário não-dono (`SESSION_NOT_OWNED`).
* **ProgressionEngine** — conclusão de lição, avanço de nível, seleção da próxima lição, diferença entre progressão normal e reforço.
* **ResetProgress** — reset apaga sessões, desempenho por tecla, Cartão de Progresso e progresso do usuário, zera o nível para 1 e preserva a conta e o layout; isolado por usuário (RN17, RN31).
* **GetLessonPerformance** — cálculo de `bestAccuracy`, `lastAccuracy`, `attempts` e `status` por lição a partir de sessões `COMPLETED`; 4 estados (NOT_STARTED, MASTERED, REVIEW, PRACTICING); guarda `attempts ≥ 2` para REVIEW; isolamento por usuário (RN17, RN32).
* **DailyMetricsAggregate** — soma de contadores por `(userId, layout, date)`; derivação de `netWpm`/precisão/latência do dia; idempotência (re-submit RN14 não duplica); janelas 7/30/90 (RN35); isolamento por usuário/layout (RN17, RN11).
* **MasteryProximityIndex** — MPI ∈ [0,1] com pesos `MPI_W_*` em §26; `latTerm = 0` quando `averageLatencyMs = 0`; satura em 1,0 somente com os 4 gates do RN09; faixas (RN36). Testes de propriedade: monotonicidade e saturação.
* **GetDashboard\*** (habits/mastery/proximity) — séries e KPIs, heatmap 7 dias, lista de proximidade ordenada, transições de mastery; isolamento por usuário (RN17, RN34–RN37).
* **Autenticação** — registro com e-mail duplicado, login com credencial inválida, acesso sem token, acesso com token expirado/inválido, acesso a recurso de outro usuário, hashing de senha (nunca compara texto puro).

---

## 30. Ordem de Implementação

```text
FASE 1 — Domain Core
  Layout, Email, KeystrokeEvent, SessionMetrics
  User (com passwordHash), UserProfile, Lesson, TypingSession, KeyPerformance, Progress

FASE 2 — Domain Services
  MetricsEngine, AdaptiveLessonEngine, ProgressionEngine

FASE 3 — Testes de Domínio
  Todas as regras críticas, incluindo RN16–RN21

FASE 4 — Application
  Use Cases, DTOs, Application Services (incluindo Register/Login)

FASE 5 — Infrastructure
  TypeORM, SQLite, Entities, Repositories, Migrations, hashing (bcrypt), emissão/verificação de JWT

FASE 6 — Presentation
  Express, Controllers, Routes, Middlewares (incluindo authMiddleware), Validators, Error Handler

FASE 7 — Integração
  HTTP → Controller → Use Case → Domain → Repository → Database, com autenticação ponta a ponta

FASE 8 — Migração de apresentação (ADR-016/017/018)
  Nest.js (backend), Next.js (UI web) — arquitetura MVC na apresentação, nenhuma RN no cliente

FASE 9 — Dashboard do progresso (RN34–RN37, RNF11, ADR-020)
  DailyMetricsAggregate + KeyMasteryTransition + MasteryProximityIndex (domínio, TDD)
  SubmitTypingSession mantém agregado diário (RN14) e log de transição de mastery
  Use cases GetDashboard{Habits,Mastery,Proximity} + rotas /me/dashboard/* (Nest/Express, RN17)
  UI web: página /app/dashboard com Recharts (8 visualizações) — pré-agregação vem do backend
  Bench RNF11 (bench:dashboard, 1 ano por semana) e revalidação RNF06
```

A implementação começa pelo domínio e seus testes. Controllers, TypeORM ou banco de dados não são o primeiro passo.

---

## 31. Critérios de Aceitação do Domínio

* [ ] Entidades implementadas (incluindo `User.passwordHash`).
* [ ] Value Objects implementados.
* [ ] Regras de sessão testadas.
* [ ] `MetricsEngine` testado, incluindo `FinalUncorrectedErrors`.
* [ ] `WeakKeyScore` testado.
* [ ] Estados de mastery testados, incluindo `KeyAccuracy` e a semântica dos dois contadores.
* [ ] Regressão testada.
* [ ] Layout isolation testado.
* [ ] `AdaptiveLessonEngine` testado, incluindo desempate de arredondamento (RN19).
* [ ] `ProgressionEngine` testado.
* [ ] Submit idempotente testado.
* [ ] Autenticação testada (RN16–RN18), isolando dados por usuário.
* [ ] Nenhuma regra depende de TypeORM, Express, bcrypt ou jsonwebtoken diretamente (apenas via porta).

---

## 32. Decisões Arquiteturais Importantes

* **KeyPerformance ≠ Progress** — desempenho motor por tecla vs. progresso curricular; não fundir.
* **Adaptive ≠ Progression** — o mecanismo adaptativo recomenda reforço; o curricular determina a próxima lição formal; coexistem.
* **Métricas ≠ Persistência** — `MetricsEngine` calcula; o Repository persiste; nenhum assume a responsabilidade do outro.
* **Autenticação ≠ Autorização de domínio** — o middleware de auth resolve *quem* está falando; a regra de posse (`SESSION_NOT_OWNED`, RN17) é verificada pelo caso de uso/domínio, não pelo middleware, porque depende de dados do próprio agregado.

---

## 33. Estado Atual

**PRD v1.6 — Ativo (aprovado para implementação); a Fase 9 (Dashboard) foi especificada (RN34–RN37, RNF11, ADR-020) com a recomendação de pesos do `MasteryProximityIndex` validada (`MPI_W_ACCURACY=0.35`, `MPI_W_LATENCY=0.25`, `MPI_W_STREAK=0.25`, `MPI_W_ATTEMPTS=0.15`).**

Histórico consolidado:
* v1.0–v1.4: núcleo de domínio, autenticação (ADR-010), auditoria Sommerville (Requirement Engineering) — `KeyPerformance`, mastery, pools, RNF06 validado.
* v1.5: RN31 (reset), RN32 (status por lição), RN33 (pacing de prática, ADR-019).
* v1.6: RN34–RN37 + RNF11 (Fase 9 — dashboard) — ver §27, §28.1, §26 e ADR-020.

Fase 1 (Domain Core) concluída; Fases 2–7 concluídas (backend assíncrono real, 620 testes); Fase 8 concluída (migração web/Nest via ADR-016/017/018); **Fase 9 em implementação** (TASK-092–100). Pendências "A VALIDAR" resolvidas (ADR-010).

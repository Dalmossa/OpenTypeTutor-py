# UI/UX Specification (UI-UX-SRD) — OpenType Tutor v1.0

**Versão:** 1.0
**Data:** 2026-09-21
**Status:** Ativo — documento container de especificação de experiência do produto (web, Fase 8 — ADR-016/017/018)
**Natureza:** apresenta **o quê e por quê** da experiência de UI/UX, derivada do PRD v1.7 + ADR-018 + DESIGN.md. Não duplica RNs, parâmetros ou contrato HTTP (vivem no PRD); não duplica tokens visuais (vivem em DESIGN.md); não duplica modelos de sistema (vivem em SRD.md). Qualquer divergência entre leituras de documentos prevalece: `PRD.md > UI-UX-SRD.md > DESIGN.md`.

---

## 1. Identidade do Produto

### 1.1 Nome

**OpenType Tutor** — ambiente de aprendizagem de digitação adaptativo.

### 1.2 Propósito

Transformar a prática do teclado em um processo **progressivo, mensurável e adaptativo**: o sistema observa o desempenho real durante as sessões (precisão, velocidade, latência, desempenho por tecla), identifica o que precisa de reforço e adapta as próximas atividades ao que foi observado — e não ao que o usuário declara (PRD §1).

### 1.3 Missão

Fazer a pessoa digitar com **saúde, automatismo e domínio progressivo do teclado** — em qualquer layout (ABNT2 ou US-INTERNATIONAL), do primeiro caractere à fluidez em textos longos.

### 1.4 Proposta de valor

- **Adaptação real por tecla** — cada tecla tem desempenho próprio; o treino muda com o observado (WeakKeyScore, RN04–RN07; pools de reforço, §24).
- **Jornada curricular em 7 fases** — progressão pedagógica explícita e visível (RN25).
- **Métricas claras** — velocidade, precisão, latência e proximidade da maestria, sempre legíveis (RN34–RN37).
- **Ergonomia como prioridade** — check-in, pausas preventivas e regra de segurança para dor (RN24, RN28, RN33).

### 1.5 Posicionamento

Não é um jogo de velocidade nem um teste de aptidão. É um **treinador pessoal de digitação**: rigoroso, técnico e calmo — com o visual que comunica software bem-feito (DESIGN.md, canvas escuro + acento lavender único).

---

## 2. Princípios de UX

| #    | Princípio                                   | Tradução em UI                                                                                                                                      |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-1 | **O progresso é visível e explicável**      | Toda métrica mostrada tem significado pedagógico; o usuário entende _por que_ aquilo está ali (rótulo + contexto, nunca cor sozinha — RN36 bandas). |
| UX-2 | **A adaptação é perceptível**               | O reforço e as lições seguintes refletem o que o usuário errou; não há sensação de "modo automático invisível".                                     |
| UX-3 | **Um foco por vez**                         | A sessão de digitação pede apenas digitar; nada compete com a tarefa (sem popups, sem anúncios, sem grandes interrupções).                          |
| UX-4 | **Feedback imediato, gentil e construtivo** | Dica visual da tecla aguardada (RN39), status por lição (RN32), veredito do motor (RN40), Cartão de Progresso (RN27).                               |
| UX-5 | **Saúde > meta**                            | A regra de segurança (dor/formigamento = parar) tem precedência visual e textual sobre qualquer meta (RN28).                                        |
| UX-6 | **Continuação sem fricção**                 | O Cartão de Progresso é copiável e resume, em poucas linhas, onde parou (RN27, RN30) — retomada imediata.                                           |
| UX-7 | **Controle do usuário**                     | Pausar/retomar a qualquer momento, repetir lição, recomeçar o curso do zero com confirmação (RN31, RN40).                                           |
| UX-8 | **pt-BR autêntico**                         | Todos os textos, mensagens e conteúdo em português do Brasil (PRD §1.1, ADR-011) — sem afetar código, rotas e identificadores (inglês).             |

---

## 3. Arquitetura de Informação

### 3.1 Estrutura conceitual

O produto tem **dois públicos**: o visitante (não autenticado) e o aluno (autenticado). A porta de entrada **apresenta o produto antes de pedir que ele seja usado** — Landing Page ≠ Dashboard.

```
OPEN TYPE TUTOR
│
├── (público) LANDING PAGE          → /            apresenta e comunica o produto
│     Hero · O que é · Como funciona · Método adaptativo · Jornada (7 fases) · Métricas · Para quem · Sobre o OpenType Tutor · CTA
│
├── (público) AUTENTICAÇÃO          → /login, /register
│
└── (aluno)   ÁREA DO ALUNO         → /app        acompanha o aluno
      Dashboard · Lições · Sessão de digitação · Progresso · Perfil
```

### 3.2 Roteamento web (Next.js App Router)

| Rota                   | Acesso      | Papel                                                        |
| ---------------------- | ----------- | ------------------------------------------------------------ |
| `/`                    | Público     | Landing Page institucional/pedagógica                        |
| `/login` · `/register` | Público     | Autenticação                                                 |
| `/app`                 | Autenticado | Home do aluno (resumo de onde está + próximas ações)         |
| `/app/dashboard`       | Autenticado | Evolução, mapa de calor, proximidade da maestria (RN34–RN37) |
| `/app/lessons`         | Autenticado | Lista de lições com status visual (RN32) e início de sessão  |
| `/app/progress`        | Autenticado | Progresso curricular, teclas fracas, reset (RN31)            |
| `/app/session`         | Autenticado | Tela de digitação em si (via seleção de lição)               |
| `/app/profile`         | Autenticado | Layout ativo, nível, fuso (RN37)                             |

> Nota: rotas autenticadas = layout protegido sob `AuthProvider` + `AppNav` (existente). A Landing é a única rota pública raiz e **não** herda o shell da área do aluno.

---

## 4. Landing Page

Selo: **estratégica para o produto.** Responde, nos primeiros segundos: _o que é, para quem, que problema resolve, como o método funciona e como começar._

### 4.1 Hero

- Eyebrow: `OPEN TYPE TUTOR` (Desktop/`eyebrow`, +0.4px tracking).
- Headline (display, negativo tracking): **"Digite melhor. Aprenda pelo desempenho observado."**
- Subhead (body-lg): a proposta em uma linha — _"Treinador adaptativo de digitação para ABNT2 e US-INTERNATIONAL: o sistema observa precisão, velocidade e latência por tecla e adapta o treino à sua evolução."_
- CTAs: `button-primary` **"Começar agora"** (→ `/register`) + `button-secondary` **"Entrar"** (→ `/login`).
- Foco visual: mockup do dashboard real (`product-screenshot-card`) — o produto é o protagonista, não propaganda.

### 4.2 O que é o OpenType Tutor?

Card de 3 colunas (`feature-card`):

- **Ambiente de aprendizagem** — prática guiada de digitação, do básico à fluidez.
- **Treinamento adaptativo** — as próximas atividades nascem do que você errou (PRD §1: adaptar pelo desempenho observado).
- **Mensurável** — velocidade, precisão, latência e proximidade da maestria, sempre visíveis.

### 4.3 Como funciona?

Sequência de 4 passos (linha do tempo):

1. **Você digita** — sessões guiadas em fases pedagógicas.
2. **O sistema observa** — por tecla: acurácia, latência, recência (WeakKeyScore).
3. **O treino se adapta** — lições de reforço nas teclas que precisam de prática.
4. **Você evolui e mensura** — dashboard, mapa de calor e proximidade da maestria.

### 4.4 Método de aprendizagem (7 fases — RN25)

Secção heroica do landing: a **jornada** transforma a progressão curricular em narrativa. Cada fase com nome em português + tagline pedagógica + réf. à fase RN:

| Fase RN25          | Jornada                      | Tagline                          |
| ------------------ | ---------------------------- | -------------------------------- |
| `ERGONOMICS_SETUP` | ① Ergonomia                  | Preparando seu espaço            |
| `HOME_ROW`         | ② Linha Inicial              | Construindo a memória muscular   |
| `UPPER_LOWER_ROWS` | ③ Linhas Superior e Inferior | Ampliando seu domínio            |
| `WORD_FIXATION`    | ④ Fixação de Palavras        | Transformando teclas em palavras |
| `ACCENTUATION`     | ⑤ Acentuação                 | Digitando em português           |
| `LONG_TEXTS`       | ⑥ Textos Longos              | Desenvolvendo fluidez            |
| `NUMERIC_KEYPAD`   | ⑦ Teclado Numérico           | Dominando números e símbolos     |

Apresentação em 7 cards conectados (vertical ou carrossel em desktop; cards empilhados em mobile) com arrow `↓` entre fases.

### 4.5 Aprendizagem adaptativa

Explica em linguagem não técnica o fator diferenciador:

- **Reforço individual por tecla** — cada tecla tem seu próprio desempenho; o reforço entra nos pools WEAK/CONSOLIDATING/MASTERED (PRD §24).
- **Maestria explícita** — uma tecla é dominada com `KeyAccuracy ≥ 95%`, `attempts ≥ 30` e latência ≤ 500ms em 3 sessões consecutivas (RN09), personificada visualmente como _proximidade da maestria_ no dashboard (RN36, MPI).
- **Correção que ensina** — corrigir um erro não gera um segundo erro (RN12); o comportamento é observado, não punido.

### 4.6 Métricas

Grid de 4 números-frase (sem inventar métrica; todas existem no PRD):

- **PPM** (velocidade líquida, RN01–RN02) — "quantas palavras por minuto úteis".
- **Precisão** (RN03) — "acertos sobre o que foi digitado".
- **Latência média** (RN06) — "velocidade de resposta por tecla".
- **Proximidade da maestria** (RN36) — "a que distância cada tecla está de ser dominada".

### 4.7 Para quem é?

- Quem está aprendendo digitação **do zero** e quer método (especialmente pt-BR: acentuação, ABNT2, US-INTL).
- Quem já digita mas quer **corrigir vícios e ganhar precisão**.
- Quem prioriza **saúde durante a prática** (ergonomia, pausas preventivas).

### 4.8 Sobre o OpenType Tutor

(Seção "Sobre", **não** "Quem Somos" corporativo.) Preposição educacional e técnica do projeto:

> O OpenType Tutor é um ambiente de aprendizagem de digitação desenvolvido para transformar a prática do teclado em um processo progressivo, mensurável e adaptativo. O sistema acompanha o desempenho durante as sessões, identifica quais teclas precisam de mais prática e adapta as próximas atividades ao desempenho observado — permitindo que o treinamento acompanhe a evolução de cada aluno.

Bônus: citar que o treinamento **respeita o layout do usuário** (RN11) e é **independente do nível declarado** — argumento forte para o público técnico (PRD §1).

### 4.9 CTA final

`cta-banner`: headline **"Comece sua jornada de digitação."** + texto de apoio + `button-primary` "Começar agora" + `button-tertiary` "Ver a área do aluno" (somente se já autenticado → `/app`).

---

## 5. Autenticação

### 5.1 Login e Cadastro

- Páginas dedicadas `/login` e `/register` (existem), sem shell do app.
- **Cadastro**: nome, e-mail, senha (política mínima → RN18, min 8; mensagens Zod pt-BR — TASK-070). Checkbox de escolha de layout inicial **opcional** (default ABNT2; alterável depois no perfil).
- **Login**: e-mail + senha; erro `INVALID_CREDENTIALS` com mensagem pt-BR genérica (não revela se e-mail existe).
- **Feedback de ação**: estados carregando / erro inline; redirecionamento pós-sucesso para `/app`.

### 5.2 Tokens

Nenhum detalhe de token na UI (cookies httpOnly existentes — TASK-078). O usuário nunca vê `ott_*`, expiração ou refresh. Mensagem de sessão expirada, quando houver, é calma e reautentica: **"Sua sessão expirou. Entre novamente para continuar."** (RN16/RN17 — auth permanece no backend).

---

## 6. Área do Aluno

### 6.1 Shell (Layout de app)

- `AppNav` (existente): navegação Dashboard · Lições · Progresso · Perfil + menu de sair. Números do PRD não aparecem em código (inglês); rótulos de UI em pt-BR (ADR-011).
- Home `/app`: saudação + **resumo tripartite**: (a) onde estou (nível/fase), (b) próxima lição + CTA, (c) atalho para dashboard.

### 6.2 Dashboard (`/app/dashboard` — RN34–RN37, ADR-020)

Já implementado (TASK-098 + melhorias). Especificação de conteúdo:

- **KPIs com comparação** — cartões com delta vs período anterior (melhoria já entregue); valores sempre com rótulo (acessibilidade).
- **Tendência** (RN35) — linhas PPM/precisão/latência com seletor 7/30/90 + período customizado; linha tracejada = período comparativo.
- **Mapa de calor** (RN34) — teclado visual do layout ativo; cor nunca acima de quantidade — tooltip com contagem + dias ativos.
- **Proximidade da maestria** (RN36) — lista por tecla com MPI ∈ [0,1] e bandas rotuladas (longe / em progresso / próximo / às vésperas); cor sempre acompanhada de rótulo.
- **Streaks/Dias ativos** (RN37) — streak por dia calendário local.
- **Transições de mastery / distribuição de estados** — visão do comportamento temporal (KeyMasteryTransition) sem expor jargão técnico (`MASTERED` → "Dominada").

### 6.3 Lições (`/app/lessons`)

- Lista de lições com **status visual por lição** (RN32): MASTERED (verde, "Dominada") · REVIEW (vermelho, "Revisar") · PRACTICING (âmbar, "Em prática") · NOT_STARTED ("Não iniciada"); precedência Bloqueada > Próxima > status (implementada, TASK-088).
- Proximidade dos labels: nunca cor sozinha.

### 6.4 Sessão de digitação (leitura /app/session)

- Teclado virtual espelhando o físico (RN38 — numpad realista; tecla morta; acentos).
- Dica visual da tecla aguardada pós `KEY_HINT_TIMEOUT_MS` (RN39; `web/lib/typing-hints.ts`).
- Barra de progresso da lição + live stats discretos (PPM bruta/líquida, acurácia, latência, erros — já existe via `useTypingSession`).
- Controles: Pausar/Retomar sempre disponíveis (RN40).
- **Veredito do motor, não da UI**: "Avançar" (azul) se o motor decidir `advance`; "Repetir lição"/"Voltar às lições" nos demais motivos; erros finais orientam a **mensagem**, nunca escondem o botão (RN40).

### 6.5 Conclusão da lição (`session` result panel)

- Resumo 2–3 linhas + **Cartão de Progresso copiável** + lembrete de pausa/alongamento (RN30).
- Erros finais contabilizados: `FinalUncorrectedErrors = max(0, TotalErrors − CorrectedErrors)` (RN21) apresentados como **"N erros finais"** com orientação de repetição quando aplicável.

### 6.6 Progresso (`/app/progress` — RN31)

- Cartão de progresso curricular (nível, lições completadas, última sessão).
- Teclas fracas ordenadas por WeakKeyScore + acurácia, com badges de mastery (implementado, TASK-077).
- **Reset**: "Recomeçar do zero" com diálogo de confirmação pt-BR (implementado, TASK-086). Convite a reconsiderar antes de ação destrutiva; após reset, mensagem de sucesso e retorno ao estado limpo.

### 6.7 Perfil (`/app/profile`)

- Layout ativo (alterável — PATCH /users/me) com preview do teclado.
- Nível atual, fase da jornada, fuso horário (RN37) legível; alteração de layout com aviso de que o desempenho por tecla é isolado por layout (RN11).

---

## 7. Experiência da Sessão (Estado de Digitação)

Regras de apresentação durante a digitação:

- **Um foco**: a área central é só o exercício + teclado; stats como barra discreta, sem animação distractiva.
- **Composição de tecla morta**: indicador visual da tecla-base esperada após dead key (US-INTERNATIONAL); dica de tecla suspensa durante compose (RN39).
- **Erro**: gentle — a tecla errada marca a posição e o usuário corrige com Backspace; correção não é punida (RN12).
- **Controles sempre visíveis**: Pausar (/Retomar), Repetir (após fim), Abandonar com confirmação (sem atualizar desempenho — RN13).
- **Fim da sessão**: transição para tela de conclusão (§6.5) sem refresh perdido de estado.

---

## 8. Sistema Visual

O sistema visual **não é redefinido aqui** — é consumido de `DESIGN.md` (Linear, near-black, lavender único). A UI-UX-SRD apenas fixa o **uso**:

- **Canvas** `#010102` é a âncora; superfícies `surface-1…4` para cartões; hairline para divisões; **lavender `#5e6ad2` APENAS** para: marca, CTA primário, foco, ênfase de link.
- **Tipografia**: Linear Display (display-md/lg/xl, tracking negativo), Linear Text (body), Mono só em código/screenshot.
- **Nunca**: segundo acento cromático, gradients atmosféricos, cards spotlight, CTA pill.
- O produto protagonista: screenshots do app real enquadrados em `product-screenshot-card`.

### 8.1 Tema da Interface (Light/Dark Mode — ADR-021)

A interface do **OpenType Tutor** deve oferecer suporte a **dois temas visuais**:

- **Tema claro (Light Mode)**
- **Tema escuro (Dark Mode)**

O usuário deve poder alternar entre os dois temas por meio de um controle de alternância visível na interface, preferencialmente no cabeçalho ou na área de configurações.

A implementação dos temas deve:

1. Manter a mesma estrutura, funcionalidades e hierarquia de informações nos dois modos.
2. Adaptar cores de fundo, superfícies, textos, bordas, ícones, botões e demais componentes para garantir boa legibilidade em cada tema.
3. Manter contraste adequado entre texto e fundo nos dois modos.
4. Evitar que informações, estados ou funcionalidades dependam exclusivamente de cores.
5. Preservar a identidade visual do OpenType Tutor tanto no tema claro quanto no escuro.
6. Permitir que a preferência de tema do usuário seja preservada entre acessos.
7. O tema deve abranger toda a aplicação, incluindo:

   - Landing Page;
   - Login e cadastro;
   - Dashboard;
   - Lista de lições;
   - Tela de prática;
   - Tela de conclusão da lição;
   - Progresso e métricas;
   - Perfil e configurações;
   - Componentes auxiliares, mensagens, modais, menus e estados de erro/sucesso.

**Diretriz visual:** o tema claro e o tema escuro **não são duas interfaces diferentes**, e sim duas variações do mesmo sistema visual — identidade, componentes, espaçamentos, tipografia, hierarquia e experiência permanecem consistentes. O tema escuro **não** é a inversão simples do claro: cada tema tem paleta própria e coerente (ADR-021) mantendo contraste, legibilidade e hierarquia.

> **Diretriz de implementação:** as duas aparências são **variações da mesma UI**, não duas UIs. Todos os componentes consomem tokens de design (`bg-canvas`, `bg-surface-1`, `text-ink`, `border-hairline`, `bg-primary`) que respondem ao tema ativo (`data-theme` no `<html>`); **nenhum hex codificado** em estilos de superfície/texto. O toggle (ADR-021) é implementado em `web/lib/theme.ts` + `ThemeToggle` no `AppNav` e na top-nav da Landing, com persistência em `localStorage('ott-theme')`.

> Extensão mínima justificada (a formalizar em DESIGN.md): paleta semântica de status de lição (RN32) e de mastery usa verde/vermelho/âmbar **com rótulo sempre acoplado** (acessibilidade), mantendo escopo para a área do aluno, não para o landing.

---

## 9. Componentes

Componentes já definidos em `DESIGN.md` (`button-*`, `feature-card`, `product-screenshot-card`, `cta-banner`, `status-badge`, `top-nav`, `footer`, `text-input`). Componentes específicos de produto (novos, a implementar sob os tokens de DESIGN.md):

| Componente            | Descrição                                                 | Fonte |
| --------------------- | --------------------------------------------------------- | ----- |
| `PhaseJourney`        | Linha/grade das 7 fases (RN25) com destaque da fase atual | §4.4  |
| `PhaseBadge`          | Badge de fase atual na área do aluno                      | §6.1  |
| `LessonStatusBadge`   | Badge de lição (RN32) rótulo+cor+ícone                    | §6.3  |
| `MasteryProximityBar` | Barra MPI com banda rotulada (RN36)                       | §6.2  |
| `HeatmapKeyboard`     | Teclado visual de intensidade (RN34) com tooltip          | §6.2  |
| `VirtualKeyboard`     | Teclado de digitação espelhado (RN38) + hint (RN39)       | §6.4  |
| `ProgressCardExport`  | Cartão de Progresso copiável (RN27, RN30)                 | §6.5  |
| `PauseOverlay`        | Contagem regressiva de pausa obrigatória (RN33)           | §6.4  |

---

## 10. Responsividade

Base: `DESIGN.md` §Responsive Behavior (breakpoints 1440/1280/1024/768/480). Regras por componente de produto:

- **Landing**: foi concebida mobile-first (7 fases empilham; Hero display-xl escala p/ display-md).
- **Dashboard**: grade de KPIs 3-up → 2-up → 1-up; charts mantêm aspect ratio; seletor de período empilha.
- **Teclado virtual**: numpad e teclas escalam proporcionalmente; nunca truncam nem sobrepõem; constraint ≥ 44px alvos de toque em mobile (RN38 deve permanecer legível no menor viewport — teclas podem encolher, layout físico mantido).
- **Touch targets**: botões do app ≥ 44px em touch (DESIGN.md).

---

## 11. Acessibilidade (WCAG 2.1 AA orientação)

- **Cor nunca sozinha**: todos os estados (mastery, status de lição, bandas MPI, heatmap) carregam rótulo/ícone (RN36 "nunca cor sozinha" estende a RN32 e RN34).
- **Contraste**: ink `#f7f8f8` sobre canvas `#010102` e superfícies — relação ≥ 7:1; ink-subtle apenas em texto secundário de info não-crítica.
- **Foco visível**: focus ring lavender (`button-primary-focus` outline 2px 50%) em inputs e botões.
- **Redução de movimento**: hint-de-tecla (RN39) e microtransições devem respeitar `prefers-reduced-motion` (piscar → substituído por realce de borda estático).
- **Teclado**: toda navegação da Landing e do app é operável por teclado; a sessão de digitação já é toda teclado.
- **Semântica**: headings com hierarquia H1→H6; tabelas de métricas com `<caption>`; charts com fallback textual (resumo descritivo).

---

## 12. Estados da Interface

| Estado                         | Comportamento padrão                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**                    | Skeletons/placeholders discretos; nunca spinner em tela cheia na área do aluno (fundo preserva contexto).                                    |
| **Empty**                      | "Ver 7 dias" no heatmap vazio (já implementado); "Nenhuma sessão ainda — pratique para começar" nas telas de progresso; CTA sempre presente. |
| **Error**                      | Mensagem pt-BR do catálogo (§28.5, TASK-071) com possibilidade de retry; nunca mostrando stack/código raw ao usuário.                        |
| **Auth expirado**              | Mensagem calma + redirecionamento para re-login (§5.2).                                                                                      |
| **Pausa obrigatória**          | Overlay com contagem regressiva (RN33) — não bloqueia, informa.                                                                              |
| **Sucesso destrutivo (reset)** | Confirmação dupla + mensagem de conclusão + estado limpo.                                                                                    |

---

## 13. Microinterações

- **Hint de tecla (RN39)**: após `KEY_HINT_TIMEOUT_MS`, pulso/borda no teclado virtual; atenção à acessibilidade (§11).
- **Transição de fase**: ao concluir lição e avançar de fase, a jornada mostra a fase recém-completada (check) e a nova com destaque sutil.
- **Direção do reforço**: ao entrar em uma lição de reforço, rótulo "Treino focado nas suas teclas fracas" (sem nomes técnicos).
- **Delta de KPI**: animação breve de valor no momento da mudança (respeitando reduced-motion).
- **Cópia do Cartão de Progresso**: feedback "Copiado" por 2s após clique (RN30).

---

## 14. Rastreabilidade PRD → UI

Espelho de cada regra de domínio na camada web (ADR-018 — a UI **reflete**, nunca reimplementa).

| PRD RN / Fonte                                | Onde a UI satisfaz                                                   |
| --------------------------------------------- | -------------------------------------------------------------------- |
| RN09, RN10 (mastery/regressão)                | Badges de tecla e proximidade da maestria (§6.2, §4.6)               |
| RN24 (check-in ergonômico), RN28 (segurança)  | Checklist antes da 1ª sessão + banner de segurança (UX-5)            |
| RN25 (7 fases)                                | `PhaseJourney` na Landing (§4.4) e fase atual no app (§6.1)          |
| RN27, RN30 (Cartão de Progresso / fechamento) | `ProgressCardExport` + resumo pós-sessão (§6.5)                      |
| RN31 (reset)                                  | "Recomeçar do zero" com confirmação (§6.6)                           |
| RN32 (status por lição)                       | `LessonStatusBadge` (§6.3)                                           |
| RN33 (pacing/pausa)                           | `PauseOverlay` com contagem regressiva (§6.4 §12)                    |
| RN34 (heatmap)                                | `HeatmapKeyboard` (§6.2)                                             |
| RN35 (tendência 7/30/90 + custom)             | Trend charts + DateRangePicker (§6.2)                                |
| RN36 (MPI bandas)                             | `MasteryProximityBar` com rótulo (cor nunca sozinha) (§6.2)          |
| RN37 (fuso)                                   | Rótulos de datas no dashboard por fuso local (RN37 — backend) (§6.2) |
| RN38 (numpad)                                 | `VirtualKeyboard` (§6.4)                                             |
| RN39 (dica de tecla)                          | Hint visual pós-`KEY_HINT_TIMEOUT_MS` (§6.4 §13)                     |
| RN40 (botão avanço)                           | Veredito do motor controla "Avançar"/"Repetir" (§6.4)                |
| PRD §11.3 (dead keys)                         | Estados de composição no teclado virtual (§7)                        |
| RNF09 (pt-BR)                                 | Todos os textos e mensagens em pt-BR (§12)                           |
| ADR-018 (sem RN no cliente)                   | Toda regra citada acima chega via REST pronta para renderizar        |

---

## 15. Critérios de Aceitação da UI v1.0

- [ ] Landing Page `/` pública responde às questões do §4 (o que é, para quem, método, jornada, métricas, sobre, começar) sem exigir login.
- [ ] A Landing não duplica shell do app; roteamento `/ → /app` separado (§3.2).
- [ ] Jornada das 7 fases (RN25) visível na Landing e a fase atual refletida no app (§4.4, §6.1).
- [ ] Dashboard completo conforme RN34–RN37 (tendência + comparativo; heatmap; MPI com faixas rotuladas; streaks).
- [ ] Sessão de digitação com numpad espelhado (RN38), dica de tecla (RN39) e veredito do motor no botão Azul (RN40).
- [ ] Cartão de Progresso copiável ao fechar sessão (RN30); status por lição (RN32) com rótulo+cor+ícone.
- [ ] Pacing (RN33) com overlay de pausa (web) e reset (RN31) com confirmação.
- [ ] Todos os textos em pt-BR (RNF09); nenhuma RN reimplementada no cliente (ADR-018).
- [ ] Acessibilidade: cor nunca sozinha; foco visível; reduce-motion respeitado; contraste AA em ambos os temas.
- [ ] Light/Dark Mode (ADR-021): toggle visível em toda a app (AppNav + top-nav da Landing), preferência persistida, toda a tela coberta por tokens.
- [ ] `npx @google/design.md lint DESIGN.md` limpo e tokens consumidos (não duplicados).

---

## 16. Fora de Escopo (v1.0 da UI)

- Dashboard do desktop (`customtkinter`) — web-first (ADR-020 §3).
- OAuth/login social e recuperação de senha (fora de escopo do produto — ADR-013 §13.4).
- Interações avançadas de gamificação (placares, streak social) — **não** pertencem à identidade do produto (§1.5).
- Páginas "Preços" ou "Planos" — não há planos no produto.

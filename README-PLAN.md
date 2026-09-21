Agora sim. Com o **PRD v1.7 completo**, fica muito mais claro onde está o problema que você identificou na UI/UX.

E, olhando especificamente para o documento que você enviou, eu faria uma distinção importante:

> **O PRD não está minimalista. A especificação do produto é bastante rica. O que está minimalista é a forma como essa riqueza está sendo apresentada ao usuário na camada web.**

Isso muda bastante a solução.

### O que o PRD já define

O PRD já contém uma identidade pedagógica forte:

- tutor adaptativo de digitação;
- aprendizagem baseada em desempenho observado;
- progressão em **7 fases pedagógicas**;
- reforço individual por tecla;
- métricas de velocidade, precisão e latência;
- Mastery e proximidade da maestria;
- dashboard de evolução;
- mapa de calor;
- teclado virtual;
- feedback visual;
- pacing e pausas;
- ergonomia;
- Cartão de Progresso;
- suporte a ABNT2 e US-International;
- lições de introdução, prática, reforço e avaliação.

Por exemplo, a própria RN25 estabelece:

`ERGONOMICS_SETUP → HOME_ROW → UPPER_LOWER_ROWS → WORD_FIXATION → ACCENTUATION → LONG_TEXTS → NUMERIC_KEYPAD`

Ou seja, **existe uma metodologia de ensino definida**.

O problema é que essa identidade está predominantemente descrita como **regra de domínio**, e não como **experiência de apresentação do produto**.

### O ponto que eu acrescentaria

Eu não mexeria no núcleo do PRD v1.7 para resolver isso.

A própria arquitetura já separa a apresentação na Fase 8:

> **"Migração de apresentação (ADR-016/017/018)"**

e o ADR-018 estabelece MVC para a camada de apresentação.

Então eu criaria um documento complementar:

# `UI-UX-SRD.md` — Especificação de UI/UX do OpenType Tutor

Ele seria responsável por transformar o que o PRD já definiu em uma **experiência de produto coerente**.

A estrutura poderia ser:

```text
OpenType Tutor
│
├── 1. Identidade do Produto
│   ├── Nome
│   ├── Propósito
│   ├── Missão
│   ├── Proposta de valor
│   └── Posicionamento
│
├── 2. Experiência que queremos transmitir
│   ├── Educacional
│   ├── Progressiva
│   ├── Adaptativa
│   ├── Mensurável
│   └── Humana
│
├── 3. Arquitetura de Informação
│
├── 4. Landing Page
│   ├── Hero
│   ├── O que é o OpenType Tutor?
│   ├── Como funciona?
│   ├── Método de aprendizagem
│   ├── As 7 fases
│   ├── Aprendizagem adaptativa
│   ├── Métricas
│   ├── Para quem é?
│   ├── Sobre o projeto
│   └── CTA
│
├── 5. Autenticação
│   ├── Login
│   └── Cadastro
│
├── 6. Área do aluno
│   ├── Dashboard
│   ├── Lições
│   ├── Prática
│   ├── Progresso
│   └── Perfil
│
├── 7. Experiência da lição
│
├── 8. Experiência da sessão
│
├── 9. Conclusão da lição
│
├── 10. Sistema Visual
│
├── 11. Componentes
│
├── 12. Responsividade
│
├── 13. Acessibilidade
│
├── 14. Estados da interface
│
├── 15. Microinterações
│
└── 16. Rastreabilidade PRD → UI
```

## E eu mudaria a concepção da página inicial

Hoje, pelo que você descreveu, parece existir algo próximo de:

```text
OpenType Tutor
     ↓
Login / começar
     ↓
Área do aluno
```

Eu faria:

```text
                         OPEN TYPE TUTOR
                               │
                    ┌──────────┴──────────┐
                    │                     │
              VISITANTE                ALUNO
                    │                     │
                    ▼                     ▼
              LANDING PAGE            DASHBOARD
                    │                     │
       ┌────────────┼────────────┐       │
       │            │            │       │
     O que?      Como?       Método?     │
       │            │            │       │
       └────────────┼────────────┘       │
                    │                     │
                    ▼                     │
             7 FASES DO CURSO             │
                    │                     │
                    ▼                     │
             APRENDIZAGEM ADAPTATIVA      │
                    │                     │
                    ▼                     │
                 MÉTRICAS                 │
                    │                     │
                    ▼                     │
             SOBRE O PROJETO               │
                    │                     │
                    ▼                     │
                COMEÇAR ──────────────────┘
```

Assim, o visitante **entende o produto antes de ser solicitado a utilizá-lo**.

---

### Um ponto particularmente importante

Eu evitaria transformar o "Quem Somos" em uma página corporativa genérica.

O OpenType Tutor não precisa parecer uma empresa vendendo um SaaS.

Ele é, conforme o próprio PRD, um **ambiente de aprendizagem de digitação adaptativo**.

Então a seção poderia se chamar:

> **Sobre o OpenType Tutor**

e responder:

**O que é?**

> O OpenType Tutor é um ambiente de aprendizagem de digitação desenvolvido para transformar a prática do teclado em um processo progressivo, mensurável e adaptativo.

**Como aprende?**

> O sistema acompanha o desempenho durante as sessões e identifica quais teclas precisam de mais prática.

**O que acontece depois?**

> As próximas atividades são adaptadas ao desempenho observado, permitindo que o treinamento acompanhe a evolução de cada aluno.

Isso vem diretamente da proposta central do PRD, especialmente do princípio:

> **"O sistema deve adaptar o treinamento com base no desempenho observado, e não apenas no nível declarado pelo usuário."**

---

## E existe outra oportunidade muito boa

As **7 fases pedagógicas** podem virar um dos elementos centrais da identidade visual.

Em vez de simplesmente mostrar:

> Lição 3 — Linha Inicial

poderíamos apresentar algo como:

```text
SUA JORNADA

① Ergonomia
   Preparando seu espaço

      ↓

② Linha Inicial
   Construindo a memória muscular

      ↓

③ Linhas Superior e Inferior
   Ampliando seu domínio

      ↓

④ Fixação de Palavras
   Transformando teclas em palavras

      ↓

⑤ Acentuação
   Digitando em português

      ↓

⑥ Textos Longos
   Desenvolvendo fluidez

      ↓

⑦ Teclado Numérico
   Dominando números e símbolos
```

Isso transforma uma sequência de requisitos do backend em **uma narrativa de aprendizagem**.

E isso é exatamente o que está faltando na percepção de identidade.

---

## Minha recomendação para o próximo passo

Agora que você enviou o PRD, eu acho que temos informação suficiente para fazer algo mais sério do que simplesmente "dar ideias".

Podemos construir a **Especificação UI/UX v1.0 do OpenType Tutor**, derivada diretamente do PRD v1.7 + ADR-018, sem inventar novas regras de domínio.

Ela definiria **o conteúdo, estrutura, hierarquia, navegação, identidade e experiência** da aplicação, deixando claro:

**PRD**

> O que o produto faz.

**ADR**

> Como a arquitetura deve funcionar.

**UI/UX-SRD**

> Como o usuário percebe, entende e utiliza tudo isso.

E, principalmente, podemos fazer a **Landing Page deixar de ser uma página minimalista de entrada e passar a ser a apresentação oficial do OpenType Tutor e de sua metodologia de aprendizagem**.

---

# Anexo A — Estado de implementação (24/09)

O plano deste documento já foi, em grande parte, executado no repo `Open-type-tutor-py`. Mapeamento plano → artefato → status:

| Item do plano                                     | Artefato no repo                                                                                                                                                                                                  | Status                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `UI-UX-SRD.md` v1.0 (estrutura de 16 seções)      | `UI-UX-SRD.md` (Identidade, UX, IA, Landing, Autenticação, Área do aluno, Sessão, Sistema Visual, Componentes, Responsividade, A11y, Estados, Microinterações, Rastreabilidade PRD→UI, Critérios, Fora de escopo) | ✅ Implementado                              |
| Landing como apresentação oficial (§4.1–4.9)      | `web/components/landing/landing-page.tsx` (Hero, O que é, Como funciona, Método/7 fases, Adaptativa, Métricas, Para quem, Sobre, CTA)                                                                             | ✅ Implementado (TASK-103, commit `c12e19e`) |
| Narrativa das 7 fases ("SUA JORNADA")             | `web/components/landing/phase-journey.tsx` (① Ergonomia…⑦ Teclado Numérico — verbatim do plano)                                                                                                                   | ✅ Implementado                              |
| "Sobre o OpenType Tutor" (não-SaaS)               | seção §4.8 da landing                                                                                                                                                                                             | ✅ Implementado                              |
| Fluxo Visitante × Aluno (landing ≠ dashboard)     | `/` (landing) + `/app/**` (aluno, JWT) — ADR-016/017/018, Fase 8                                                                                                                                                  | ✅ Implementado                              |
| Área do aluno: Dashboard/Lições/Prática/Progresso | `/app/dashboard`, `/app/lessons`, `/app` (prática/hub), `/app/progress`                                                                                                                                           | ✅ Implementado                              |
| Área do aluno: **Perfil**                         | `UI-UX-SRD.md §6.7` spec; **`/app/profile` não existe**                                                                                                                                                           | ⏳ Única lacuna                              |

## Anexo B — Execução pendente: Perfil (`/app/profile`, UI-UX-SRD §6.7)

Contrato de backend já disponível (Fase 9): `GET /users/me` e `PATCH /users/me { layout }` (TASK-057, testado no backend — `src/presentation/app.test.ts`). Escopo de execução no cliente:

1. `web/services/api-client.ts` — adicionar `updateLayout(token, layout)` (`PATCH /users/me`), espelhando `getMe()`.
2. `web/app/app/profile/page.tsx` (client) — usar `useAuth()`:
   - Dados da conta: nome, email, nível atual (`currentLevel`), layout ativo (`activeLayout`).
   - Seletor de layout (ABNT2 / US-INTERNATIONAL) + **preview do teclado** (render simples das teclas).
   - Aviso RN11: desempenho por tecla é isolado por layout.
   - `PATCH /users/me` ao trocar; atualizar contexto de auth (resposta devolve `activeLayout`/`currentLevel`).
   - Fase da jornada: derivar do `currentLevel` via `web/lib/pedagogical.ts` (sem inventar regra). **Fuso horário (RN37)**: não está no `GetUserResponseDTO` → fora de escopo do cliente; anotar como dependência de backend, não exibir inventando dado.
3. Navegação — link "Perfil" no `web/components/app-nav.tsx` (desktop) e no hub móvel (`/app/page.tsx`).
4. Testes (TDD, vitest web): `updateLayout` (api-client via fetch mock) e `page.test.tsx` (render com auth mock, troca de layout → PATCH chamado + preview atualizado). Rodar `tsc --noEmit`, `vitest run`, `npm run build`.

Entrega: commit `feat(web): perfil com troca de layout ABNT2/US (UI-UX-SRD §6.7)`. Sem alteração de núcleo do PRD (não inventa RN nova — RN11 se refere à regra existente).

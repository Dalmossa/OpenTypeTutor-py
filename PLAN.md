# Plano de Execução — Fase 0: Fundação Técnica

> **Status**: ✅ Concluído — Ambiente inicializado e validado (lint + typecheck + build)

---

## 1. Resumo do que foi feito

| Item | Descrição | Status |
|------|-----------|--------|
| `package.json` | Inicializado com scripts, dependências de prod/dev | ✅ |
| `tsconfig.json` | Strict mode, paths `@/*`, noUncheckedIndexedAccess, exactOptionalPropertyTypes | ✅ |
| Estrutura `src/` | Clean Architecture (domain, application, infrastructure, presentation, shared) | ✅ |
| ESLint 10 (flat config) | `typescript-eslint` + `eslint-plugin-boundaries` com regras de layer | ✅ |
| Vitest | Configurado com coverage 90% em `domain/`, convenção `RNXX` | ✅ |
| `adaptiveParams.ts` | Parâmetros validados (ADR-010) em `domain/config/` | ✅ |
| `authParams.ts` | `BCRYPT_SALT_ROUNDS=12`, `JWT_EXPIRATION=24h`, `MIN_PASSWORD_LENGTH=8` | ✅ |
| Logger | Pino configurado (pretty em dev, JSON em prod) | ✅ |
| Error handling | `DomainError` + `AppError` com formato padronizado RNF02 | ✅ |
| Server base | Express + health check + error handler global | ✅ |

---

## 2. Comandos validados

```bash
npm run lint      # ✅ Sem erros (boundaries + TS strict)
npm run typecheck # ✅ Sem erros
npm run build     # ✅ Compila para dist/
npm run test      # ⚠️ Sem testes ainda (esperado)
npm run dev       # ✅ Inicia tsx watch
```

---

## 3. Estrutura de pastas criada

```
src/
├── domain/
│   ├── config/adaptiveParams.ts
│   ├── entities/           # (implementado — TASK-007 a TASK-013)
│   ├── value-objects/      # (implementado — TASK-006)
│   ├── repositories/       # (interfaces — TASK-014)
│   ├── services/           # (implementado — TASK-021, 031, 033)
│   └── errors/DomainError.ts
├── application/
│   ├── use-cases/          # (vazio — Fase 4)
│   └── dtos/               # (vazio — Fase 4)
├── infrastructure/
│   ├── database/           # (vazio — TASK-049)
│   ├── typeorm/            # (vazio — TASK-049)
│   ├── repositories/       # (vazio — TASK-050)
│   ├── auth/authParams.ts
│   └── logger/logger.ts
├── presentation/
│   ├── controllers/        # (vazio — Fase 6)
│   ├── routes/             # (vazio — Fase 6)
│   ├── middlewares/        # (vazio — TASK-038, TASK-055)
│   └── validators/         # (vazio — Fase 6)
└── shared/
    ├── errors/AppError.ts
    └── utils/              # (vazio)
```

---

## 4. Próximos passos (BACKLOG.md — Fase 1: Domain Core)

| ID | Task | Rastreável a |
|----|------|--------------|
| **TASK-006** | Value Objects: `Layout`, `Email`, `SessionId` | PRD §6–§9 |
| **TASK-007** | Entidade `User` (com `passwordHash`, nunca exposto) | PRD §6, RNF08 |
| **TASK-008** | Entidade `UserProfile` | PRD §7 |
| **TASK-009** | Entidade `Lesson` (`type`, `difficulty`, `targetKeys`) | PRD §8 |
| **TASK-010** | Entidade `TypingSession` + `KeystrokeEvent` (estados/transições) | PRD §9, §11 |
| **TASK-011** | Entidade `SessionMetrics` | PRD §12 |
| **TASK-012** | Entidade `KeyPerformance` (chave `userId+logicalKey+layout`) | PRD §16, RN11 |
| **TASK-013** | Entidade `Progress` | PRD §22 |
| **TASK-014** | Interfaces de repositório em `domain/repositories/` | ADR-005, ADR-007 |
| **TASK-015** | Repositórios em memória (fakes) para testes | ADR-005, RNF07 |

> **Ordem recomendada (TDD)**: Testes → Implementação → Refatoração
> - Testes nomeados `RNXX - descrição` (ex.: `RN14 - submit idempotente não reprocessa`)

---

## 5. Decisões técnicas registradas

| Decisão | Valor | Fonte |
|---------|-------|-------|
| Package manager | npm (pnpm indisponível no ambiente) | — |
| HTTP Framework | Express | ADR-002 |
| ORM | TypeORM + SQLite | ADR-002 |
| Validação | Zod (schemas em `presentation/validators/`) | ADR-003, AGENTS.md |
| Test Runner | Vitest | PRD/Architecture |
| Logger | Pino | — |
| Bcrypt salt rounds | 12 | ADR-010 |
| JWT expiration | 24h (interino) | ADR-010 |
| Min password length | 8 (sem complexidade) | ADR-010 / NIST 800-63B |
| Active duration epsilon | 1000ms | ADR-010 |
| Boundary enforcement | ESLint plugin (build failure) | CONSTITUTION §1 |

---

## 6. Como continuar (Método Socrático)

Quando iniciar a **Fase 1**, recomendo:

1. **Escrever testes primeiro** (TDD) para cada Value Object / Entity
2. **Nomear testes** com `RNXX - descrição` (ex.: `RN08 - attempts < 5 → UNKNOWN`)
3. **Rodar `npm run test:watch`** durante desenvolvimento
4. **Validar a cada step**: `npm run lint && npm run typecheck && npm run test`

---

## 7. Pendências conhecidas

- [x] **Husky + commitlint** para Conventional Commits (CONSTITUTION §10) — TASK-064
- [ ] **GitHub Actions** CI (lint + typecheck + test) — opcional para Fase 0
- [x] **Refresh tokens** (TASK-034a/b/c/d) — Fase 3, conforme ADR-010
- [x] **Retrofit de idioma pt-BR** (TASK-069/070/071/072) — concluído na Fase 6
- [x] **Benchmark RNF06** (autocannon) — `npm run bench` (TASK-065), p95 33ms ≤ 150ms

---

> **Nota**: Este plano reflete o estado após a execução da Fase 0. O arquivo `BACKLOG.md` continua sendo a fonte de verdade para rastreabilidade de tasks.
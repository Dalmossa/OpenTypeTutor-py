# OpenType Tutor — UI web (Fase 8)

Interface web (Next.js App Router) consumindo o REST de `src/` (backend). O domínio/regras
permanecem no backend — o navegador **não reimplementa** RN (RN14 idempotência, RN22
insufficient-data; ADR-016/017).

## Estrutura (protocolo MVC — ADR-018)

| Camada | Pasta | Papel |
|---|---|---|
| Model | `models/` | Tipos TS = DTOs, espelho dos contratos REST (nunca entidades de domínio) |
| Service | `services/` | Comunicação REST (`ApiClient`), sem regra de negócio |
| Controller | `controllers/` | Orquestra chamadas ao service; expõe métodos usados por Views |
| View | `app/` (páginas) e `components/` | Renderização e captura de eventos de UI |

O hook `use-typing-session.ts` orquestra a sessão de digitação do lado do cliente (callback
com o controller de sessão), mantendo RN zero no navegador — idempotência (RN14) e
métricas finais (RN22) são computadas pelo backend.

## Como rodar

Dois processos — back-end Nest.js em `3001`, web em `3000`:

```bash
npm run dev                # raiz — backend Nest.js em http://localhost:3001
npm --prefix web run dev  # web — Next.js em http://localhost:3000
```

O Next reescreve `/api/*` para o backend (`web/next.config.ts`, variável `BACKEND_URL`),
mantendo mesma origem — sem CORS, e a base para o cookie httpOnly de refresh (TASK-078).

**Produção (chamada direta — RNF06/TASK-080):** o rewrite `/api/*` do Next é o gargalo
sob carga concorrente (p95 ≈ 4.8s vs ≈ 40ms direto). Em produção o navegador chama o
backend diretamente: informar `NEXT_PUBLIC_API_URL` no build da web e liberar a origem no
backend via `CORS_ORIGINS` (lista separada por vírgula). Sem `NEXT_PUBLIC_API_URL` o
cliente cai de volta no rewrite `/api/*` (modo dev / mesma origem).

```bash
# backend
CORS_ORIGINS=https://meu-dominio npm run start

# web — build com URL direta do backend
BACKEND_URL=https://api.meu-dominio NEXT_PUBLIC_API_URL=https://api.meu-dominio npm --prefix web run build
npm --prefix web run start
```

Os acessos usam header `Authorization: Bearer <accessToken>` (token obtido via server
action e guardado em estado no cliente) — sem dependência de cookie cross-origin; o token
de refresh continua em cookie httpOnly nas server actions.

## Checagens

```bash
npm --prefix web run typecheck
```

## RNF06 (TASK-080) e paridade (TASK-081)

Validados no backend javá existente; a cena A (navegador apontando para `localhost:3000`)
é coberta nas TASK-076–081.
# RN09 — Regra de Mastery (implementação)

Resumo:

- Regra pedagógica (RN09): uma tecla alcança `MASTERED` quando:
  - `KeyAccuracy >= 0.95` (95%)
  - `attempts >= 30`
  - `averageLatencyMs <= 500`
  - E isso acontece após `MASTERY_CONSECUTIVE_SESSIONS` sessões consecutivas aprovadas (3 por padrão)

Onde está implementado:

- Parâmetros: `src/domain/config/adaptiveParams.ts`
  - `MASTERY_ACCURACY`, `MASTERY_ATTEMPTS`, `MASTERY_LATENCY_MS`, `MASTERY_CONSECUTIVE_SESSIONS`.

- Cálculo de aprovação por sessão (quando uma sessão termina):
  - `src/application/use-cases/SubmitTypingSession.ts` → função `applyKeystrokePerformance`
  - Nesta função `isMasteryApproved` é calculado com:
    - `performance.keyAccuracy >= adaptiveParams.MASTERY_ACCURACY` e
    - `performance.averageLatencyMs <= adaptiveParams.MASTERY_LATENCY_MS`

- Contagem e promoção para `MASTERED`:
  - `src/domain/entities/KeyPerformance.ts` → métodos `recordSessionEnd()` e `calculateMasteryState()`
  - `recordSessionEnd(isMasteryApproved)` incrementa `consecutiveMasterySessions` quando a sessão é aprovada; ao atingir `MASTERY_CONSECUTIVE_SESSIONS` e `attempts >= MASTERY_ATTEMPTS` promove para `MASTERED`.

- Testes que cobrem o comportamento:
  - `src/domain/entities/KeyPerformance.test.ts` — casos RN09 / RN10 já existentes.

Observações e próximos ajustes possíveis:

- Ajuste fino: alterar valores em `adaptiveParams.ts` para calibrar sensibilidade (p.ex. reduzir `MASTERY_ATTEMPTS` para acelarar masteries em aulas curtas).
- Telemetria: exportar evento quando uma tecla transita para `MASTERED` (útil para A/B ou análise de curso).
- Documentação: esta página documenta onde modificar o comportamento.

Referências de código:

- `src/domain/config/adaptiveParams.ts`
- `src/application/use-cases/SubmitTypingSession.ts`
- `src/domain/entities/KeyPerformance.ts`
- `src/domain/entities/KeyPerformance.test.ts`

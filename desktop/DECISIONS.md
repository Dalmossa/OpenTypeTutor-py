# DECISIONS

- 2026-09-13: Ajustes no modelo `Lesson` e enums
  - Arquivo: `desktop/src/opentype_tutor/models/lesson.py`
  - Mudanças:
    - Adicionado `LessonType.GUIDED` para compatibilidade com uso e testes.
    - Expandido `Difficulty` com `BEGINNER`, `INTERMEDIATE`, `ADVANCED` e mantidos `GUIDED`, `REINFORCEMENT`, `FREE`.
    - Tornados opcionais/definidos valores padrão para campos que às vezes não são enviados pelo backend (`level`, `title`, `content`, `target_keys`, `difficulty`, `type`, `layout`, `order`, `created_at`).
  - Racional: os testes e alguns payloads de API fornecem objetos de lição mínimos; sem defaults o Pydantic rejeitava payloads verdadeiros. Essas alterações melhoram robustez e compatibilidade com o backend sem alterar os nomes públicos das enums.
  - Nota: essa é uma mudança de contrato internal — se o backend tiver esquema estrito, preferir alinhar o servidor. Rever a API e consolidar o contrato (camelCase vs snake_case) é recomendado.

  2026-09-14: LESSON_NOT_FOUND handling

  - Observed backend error: `LESSON_NOT_FOUND` (HTTP 404) returned when attempting to start a session for a lesson id missing on the server.
  - Short-term client behavior implemented: when `LESSON_NOT_FOUND` occurs the client refreshes lesson list and returns a friendly failure to the caller.
  - Chosen rationale: reduce user friction by attempting to recover automatically when server and local caches diverge; avoid silent crashes.
  - Long-term recommendation: align client and server contracts to avoid mismatched ids; consider server-side referential integrity checks and clearer error payloads (include `requestedLessonId`).

  Suggested follow-ups:
  - Add a UI modal informing user that the lesson was removed/changed and offer actions: `Atualizar lições` / `Ir para Lições`.
  - Add telemetry/logging for 404 events to track frequency and affected lessons.
  - Add E2E test that covers session start with missing lesson id to prevent regressions.


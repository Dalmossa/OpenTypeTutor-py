# DECISIONS

- 2026-09-13: Ajustes no modelo `Lesson` e enums
  - Arquivo: `desktop/src/opentype_tutor/models/lesson.py`
  - Mudanças:
    - Adicionado `LessonType.GUIDED` para compatibilidade com uso e testes.
    - Expandido `Difficulty` com `BEGINNER`, `INTERMEDIATE`, `ADVANCED` e mantidos `GUIDED`, `REINFORCEMENT`, `FREE`.
    - Tornados opcionais/definidos valores padrão para campos que às vezes não são enviados pelo backend (`level`, `title`, `content`, `target_keys`, `difficulty`, `type`, `layout`, `order`, `created_at`).
  - Racional: os testes e alguns payloads de API fornecem objetos de lição mínimos; sem defaults o Pydantic rejeitava payloads verdadeiros. Essas alterações melhoram robustez e compatibilidade com o backend sem alterar os nomes públicos das enums.
  - Nota: essa é uma mudança de contrato internal — se o backend tiver esquema estrito, preferir alinhar o servidor. Rever a API e consolidar o contrato (camelCase vs snake_case) é recomendado.


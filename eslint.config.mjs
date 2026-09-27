import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

// Clean Code — limites da CONSTITUTION.md §2.1 (ADR-023).
// `enforceConst` não é estética: é a exceção que corresponde à §3 — parâmetro de
// algoritmo vira constante nomeada, não literal na lógica.
const LIMITS = {
  complexity: 10,
  maxLines: 300,
  maxLinesPerFunction: 50,
  maxDepth: 4,
  maxParams: 4,
};

// Códigos HTTP não são magic numbers: são constantes nomeadas pela RFC 9110, e o
// `no-magic-numbers` não tem consciência de protocolo. Sem esta lista, 37% da
// dívida medida (43 de 115) era `res.status(201)` e `statusCode = 409` — ruído que
// esconderia os ~30 parâmetros inlineados que são defeito de verdade (CONSTITUTION §3).
//
// Isto é decisão de MEDIÇÃO, não de qualidade: o `400` continua sendo código HTTP
// onde deveria ser regra de negócio — `DomainError.statusCode` põe HTTP dentro de
// `src/domain/`, o que é vazamento de arquitetura (ADR: DomainError vs AppError).
// Corrigir isso (mapear code->status em `presentation/`) é refactor de verdade, com
// raio de alcance sobre todo o caminho de erro, e está registrado como dívida em
// ADR-023. O que este gate deixa de fazer é exigir a renameação cosmética
// `HTTP_409`, que só enterrava o problema.
const HTTP_STATUS_CODES = [200, 201, 202, 204, 400, 401, 403, 404, 409, 410, 422, 429, 500, 502, 503];

// Severidade ALVO por tier, para quando a dívida for zerada (ADR-023 item 3):
//   tiers 1-2 (domain, application, shared)   -> 'error'
//   tiers 4-5 (infrastructure, presentation) -> 'error'
// Hoje tudo em 'warn': ativar 'error' no mesmo dia da decisão derrubaria
// `npm run lint` e o CI. O flip é mecânico — trocar a constante abaixo.
const CLEAN_CODE_SEVERITY = 'warn';

const cleanCode = (severity) => ({
  complexity: [severity, LIMITS.complexity],
  'max-lines': [severity, LIMITS.maxLines],
  'max-lines-per-function': [severity, LIMITS.maxLinesPerFunction],
  'max-depth': [severity, LIMITS.maxDepth],
  'max-params': [severity, LIMITS.maxParams],
  'no-magic-numbers': [
    severity,
    {
      ignore: [-1, 0, 1, 2, 100, ...HTTP_STATUS_CODES],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      enforceConst: true,
      detectObjects: false,
    },
  ],
});

export default tseslint.config(
  // `types/` entra no ignore junto de `bench/` e `scripts/`: são declarações de
  // módulo (.d.ts) que existem para servir ao `tsconfig.bench.json`, e o
  // `parserOptions.project` aponta para o `tsconfig.json`, que tem
  // `rootDir: "./src"` e não inclui `types/`. Sem o ignore, `npm run lint`
  // (`eslint src`) nem tropeça — mas o `lint-staged` do pre-commit roda o ESLint
  // nos caminhos staged, e aí o arquivo entra com erro de parsing: um commit
  // que tocasse `types/` quebraria com um erro que o gate de lint não previa.
  { ignores: ['dist/', 'node_modules/', '*.config.*', '*.md', 'bench/', 'scripts/', 'types/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: { boundaries },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': { typescript: true },
      'boundaries/files': [
        { category: 'test', pattern: '**/*.test.ts' },
        // Composition root único desde ADR-024. `src/nestRuntime.ts` monta o
        // grafo; `src/main-nest.ts` é o entrypoint que o sobe. A categoria
        // `nest-composition` separada e `src/composition-root.ts` sumiram junto
        // com a pilha Express — uma categoria só significa que não há mais um
        // segundo lugar para esquecer de registrar um caso de uso.
        { category: 'composition', pattern: '**/src/nestRuntime.ts' },
        { category: 'composition', pattern: '**/src/main-nest.ts' },
      ],
      'boundaries/elements': [
        { type: 'domain', pattern: '**/src/domain/**' },
        { type: 'application', pattern: '**/src/application/**' },
        { type: 'infrastructure', pattern: '**/src/infrastructure/**' },
        { type: 'presentation', pattern: '**/src/presentation/**' },
        { type: 'shared', pattern: '**/src/shared/**' },
      ],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-useless-constructor': 'off',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            {
              allow: [{ to: { module: { origin: 'core' } } }],
            },
            {
              from: { element: { type: 'domain' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'shared' } } },
              ],
              disallow: [
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'presentation' } } },
                { to: { element: { type: 'application' } } },
                { to: { module: { origin: 'external', source: 'express' } } },
                { to: { module: { origin: 'external', source: 'typeorm' } } },
                { to: { module: { origin: 'external', source: 'bcrypt' } } },
                { to: { module: { origin: 'external', source: 'jsonwebtoken' } } },
                { to: { module: { origin: 'external', source: 'zod' } } },
                { to: { module: { origin: 'external', source: 'pino' } } },
              ],
            },
            {
              from: { element: { type: 'application' } },
              allow: [
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'shared' } } },
              ],
              disallow: [
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'presentation' } } },
                { to: { module: { origin: 'external', source: 'express' } } },
                { to: { module: { origin: 'external', source: 'typeorm' } } },
                { to: { module: { origin: 'external', source: 'bcrypt' } } },
                { to: { module: { origin: 'external', source: 'jsonwebtoken' } } },
                { to: { module: { origin: 'external', source: 'pino' } } },
              ],
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: [
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'shared' } } },
                { to: { module: { origin: 'external', source: 'bcrypt' } } },
                { to: { module: { origin: 'external', source: 'jsonwebtoken' } } },
                { to: { module: { origin: 'external', source: 'pino' } } },
                { to: { module: { origin: 'external', source: 'typeorm' } } },
                { to: { module: { origin: 'external', source: 'better-sqlite3' } } },
              ],
              disallow: [
                { to: { element: { type: 'presentation' } } },
                { to: { module: { origin: 'external', source: 'express' } } },
              ],
            },
            {
              from: { element: { type: 'presentation' } },
              allow: [
                { to: { element: { type: 'presentation' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'shared' } } },
                { to: { module: { origin: 'external', source: 'express' } } },
                { to: { module: { origin: 'external', source: 'zod' } } },
                { to: { module: { origin: 'external', source: '@nestjs/common' } } },
                { to: { module: { origin: 'external', source: '@nestjs/core' } } },
                { to: { module: { origin: 'external', source: '@nestjs/platform-express' } } },
              ],
              disallow: [
                { to: { element: { type: 'infrastructure' } } },
                { to: { module: { origin: 'external', source: 'typeorm' } } },
                { to: { module: { origin: 'external', source: 'bcrypt' } } },
                { to: { module: { origin: 'external', source: 'jsonwebtoken' } } },
                { to: { module: { origin: 'external', source: 'pino' } } },
              ],
            },
            {
              // Composition root: único lugar onde as 5 camadas se encontram,
              // então ele pode importar tudo — inclusive `typeorm` e `@nestjs/*`,
              // que nenhuma camada isolada pode. Também precisa de `core` e de
              // `reflect-metadata` (o Nest usa decorator + metadata, e
              // `main-nest.ts` importa `./nestRuntime.js`, ou seja, composição
              // importing composição).
              from: { file: { categories: 'composition' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: ['domain', 'application', 'infrastructure', 'presentation', 'shared'],
                      },
                    },
                  },
                },
                { to: { file: { categories: 'composition' } } },
                { to: { module: { origin: 'external' } } },
                { to: { module: { origin: 'core' } } },
              ],
            },
            {
              from: { file: { categories: 'test' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: ['domain', 'application', 'infrastructure', 'presentation', 'shared'],
                      },
                    },
                  },
                },
                { to: { file: { categories: 'composition' } } },
                { to: { module: { origin: 'external' } } },
                { to: { module: { origin: 'core' } } },
              ],
            },
          ],
        },
      ],
    },
  },

  // ─── Clean Code por tier de risco (CONSTITUTION.md §2.1, ADR-023) ──────────
  // Blocos separados por tier para que o flip warn -> error seja mecânico.
  // Tiers 1-2: onde a dívida custa bug (regra de negócio e orquestração).
  {
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts', 'src/shared/**/*.ts'],
    rules: { ...cleanCode(CLEAN_CODE_SEVERITY) },
  },
  // Tiers 4-5: adaptadores (externo e HTTP).
  {
    files: ['src/infrastructure/**/*.ts', 'src/presentation/**/*.ts'],
    rules: { ...cleanCode(CLEAN_CODE_SEVERITY) },
  },
  // Composition root único (Nest). `nestRuntime.ts` é wiring de bootstrap, e
  // `main-nest.ts` é entrypoint fino — medir estilo num wiring polui o sinal
  // (limite de linhas evita corrigir instruções de wiring). Desde ADR-024 a
  // pilha Express sumiu, então não existe mais `composition-root.ts`.
  {
    files: ['src/nestRuntime.ts', 'src/main-nest.ts'],
    rules: { ...cleanCode(CLEAN_CODE_SEVERITY), 'max-lines': 'off' },
  },
  // Dados, não lógica: migração, seed e corpus de texto são dados por natureza.
  // O glob do corpus é o caminho REAL do arquivo — `src/domain/corpus/**` casava com
  // nada e deixava `phraseCorpus.ts` (531 linhas) ser medido como se fosse código.
  {
    files: [
      'src/infrastructure/database/migrations/**/*.ts',
      'src/infrastructure/database/seed/**/*.ts',
      'src/infrastructure/repositories/phraseCorpus.ts',
    ],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off', 'no-magic-numbers': 'off' },
  },
  // `src/domain/config/**` é o lar oficial dos parâmetros (CONSTITUTION §3, ADR-011).
  // Medir `no-magic-numbers` aqui proíbe o próprio remédio que a regra prescreve:
  // o arquivo existe para conter literais nomeados, e `enforceConst` não isenta
  // objeto de parâmetro. Sem esta exceção a regra se autocancela.
  {
    files: ['src/domain/config/**/*.ts'],
    rules: { 'no-magic-numbers': 'off' },
  },
  // Testes: fixture numérica e tabela de casos são dados, não lógica — por isso
  // `no-magic-numbers`, `max-lines` e `max-lines-per-function` ficam desligados
  // aqui. `complexity` e `max-params` seguem valendo: teste com 6 params é tabela
  // que deveria virar helper.
  {
    files: ['**/*.test.ts'],
    rules: {
      'no-magic-numbers': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  }
);
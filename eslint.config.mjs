import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '*.config.*', '*.md'] },
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
        { category: 'composition', pattern: '**/src/composition-root.ts' },
        { category: 'nest-composition', pattern: '**/src/main-nest.ts' },
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
              ],
            },
            {
              from: { file: { categories: 'nest-composition' } },
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
                { to: { module: { origin: 'external' } } },
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
                { to: { module: { origin: 'external' } } },
                { to: { module: { origin: 'core' } } },
              ],
            },
          ],
        },
      ],
    },
  }
);
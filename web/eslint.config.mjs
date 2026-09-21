import js from '@eslint/js';
import pluginNext from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Lint do web — isolado do config da raiz (backend). Gate real: roda no
// pre-commit (lint-staged via `*.{ts,tsx}`) e em `npm run lint`.
// Cobre pages/componentes Next (core-web-vitals) + tipos (type-aware) + hooks.
const TYPE_AWARE_FILES = ['**/*.{ts,tsx}'];

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: [...(config.files ?? TYPE_AWARE_FILES)],
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: [...(config.files ?? TYPE_AWARE_FILES)],
  })),
  pluginNext.flatConfig.recommended,
  pluginNext.flatConfig.coreWebVitals,
  reactHooks.configs['flat/recommended'],
  {
    files: TYPE_AWARE_FILES,
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      next: { rootDir: import.meta.dirname },
    },
  },
);
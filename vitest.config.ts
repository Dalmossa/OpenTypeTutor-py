import { defineConfig } from "vitest/config";
import path from "node:path";

// Cobertura por tier de risco — CONSTITUTION.md §7, ADR-023.
// Valores são um ratchet: fixados ABAIXO do baseline medido em 2026-09-26, para
// que só código novo ou piorado seja barrado, nunca o legado. Subir um número
// aqui exige o número real acima dele (ver `Baseline medido` na §7).
//
// Só `npm run test:coverage` aplica os thresholds — `npm run test` não.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Default do vitest é false: um teste vermelho esconde o relatório inteiro,
      // então um threshold quebrado passa despercebido atrás de uma falha de teste.
      reportOnFailure: true,
      include: [
        "src/domain/**",
        "src/application/**",
        "src/infrastructure/**",
        "src/presentation/**",
        "src/shared/**",
      ],
      // Composition roots fora do threshold: são wiring de bootstrap, coberto pelo
      // e2e (`src/e2e/fullFlow.test.ts`), não por unidade. Incluí-los a 0%
      // mediria ruído, não qualidade.
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "src/main-nest.ts",
        "src/domain/RN09-Mastery.md",
      ],
      thresholds: {
        // Piso global: o menor tier. Impede que código novo entre num diretório
        // novo sem nenhum threshold próprio.
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
        // Tier 1 — regra de negócio e contrato compartilhado
        "src/domain/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "src/shared/**": {
          lines: 85,
          functions: 100,
          branches: 70,
          statements: 85,
        },
        // Tier 2 — orquestração
        "src/application/**": {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        // Tiers 3-4 — adaptador externo
        "src/infrastructure/**": {
          lines: 75,
          functions: 75,
          branches: 75,
          statements: 75,
        },
        // Tier 5 — adaptador HTTP
        "src/presentation/**": {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

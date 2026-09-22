import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNGramRepository } from "./InMemoryNGramRepository.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const LAYOUT_ABNT2 = Layout.create("ABNT2");
const LAYOUT_US = Layout.create("US-INTERNATIONAL");

describe("ADR-007/PRD §25 - InMemoryNGramRepository (corpus de reforço PT-BR)", () => {
  let repository: InMemoryNGramRepository;

  beforeEach(() => {
    repository = new InMemoryNGramRepository();
  });

  describe("getFrequency", () => {
    it("retorna frequência para n-gramas existentes no corpus", () => {
      // Single characters from ABNT2 corpus should exist
      expect(repository.getFrequency("a")).toBeGreaterThan(0);
      expect(repository.getFrequency("s")).toBeGreaterThan(0);
      expect(repository.getFrequency("d")).toBeGreaterThan(0);
      expect(repository.getFrequency("f")).toBeGreaterThan(0);
      expect(repository.getFrequency("j")).toBeGreaterThan(0);
      expect(repository.getFrequency("k")).toBeGreaterThan(0);
      expect(repository.getFrequency("l")).toBeGreaterThan(0);
      expect(repository.getFrequency(";")).toBeGreaterThan(0);
    });

    it("retorna 0 para sequência inexistente", () => {
      expect(repository.getFrequency("xyz")).toBe(0);
      expect(repository.getFrequency("")).toBe(0);
    });

    it("retorna frequência para bigramas/trigramas comuns", () => {
      expect(repository.getFrequency("as")).toBeGreaterThan(0);
      expect(repository.getFrequency("df")).toBeGreaterThan(0);
      expect(repository.getFrequency("jk")).toBeGreaterThan(0);
      expect(repository.getFrequency("kl")).toBeGreaterThan(0);
      expect(repository.getFrequency("asdf")).toBeGreaterThan(0);
      expect(repository.getFrequency("jkl;")).toBeGreaterThan(0);
    });

    it("retorna frequência para palavras comuns em português", () => {
      expect(repository.getFrequency("de")).toBeGreaterThan(0);
      expect(repository.getFrequency("da")).toBeGreaterThan(0);
      expect(repository.getFrequency("do")).toBeGreaterThan(0);
      expect(repository.getFrequency("em")).toBeGreaterThan(0);
      expect(repository.getFrequency("para")).toBeGreaterThan(0);
      expect(repository.getFrequency("com")).toBeGreaterThan(0);
    });
  });

  describe("getPatterns - layout ABNT2", () => {
    it("retorna padrões contendo as targetKeys", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s", "d", "f"],
        2,
      );

      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        expect(p.length).toBeGreaterThanOrEqual(2);
        // Should contain at least one target key
        const hasTarget = ["a", "s", "d", "f"].some((k) => p.includes(k));
        expect(hasTarget).toBe(true);
      });
    });

    it("inclui frases do corpus PT_BR_PHRASES quando layout é ABNT2", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s"],
        5,
      );

      // Should find phrases containing 'a' or 's' from PT_BR_PHRASES
      const phrasePatterns = patterns.filter((p) => p.length > 5);
      expect(phrasePatterns.length).toBeGreaterThan(0);
    });

    it("ordena frases por cobertura de targetKeys (maior cobertura primeiro)", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s", "d", "f"],
        3,
      );

      // Patterns with more target keys should come first
      const coverage = (p: string) =>
        ["a", "s", "d", "f"].filter((k) => p.includes(k)).length;
      for (let i = 1; i < patterns.length; i++) {
        const prev = patterns[i - 1];
        const curr = patterns[i];
        if (prev !== undefined && curr !== undefined) {
          expect(coverage(prev)).toBeGreaterThanOrEqual(coverage(curr));
        }
      }
    });

    it("não retorna duplicatas", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s"],
        2,
      );

      const unique = new Set(patterns);
      expect(unique.size).toBe(patterns.length);
    });

    it("limita resultados a MAX_PATTERN_RESULTS (100)", async () => {
      const patterns = await repository.getPatterns(LAYOUT_ABNT2, ["a"], 1);
      expect(patterns.length).toBeLessThanOrEqual(100);
    });

    it("gera combinações se poucos padrões encontrados", async () => {
      // Use a rare key that won't match many corpus entries
      const patterns = await repository.getPatterns(LAYOUT_ABNT2, ["z"], 5);

      // Should still return some generated combinations
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("respeita minimumLength", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s", "d", "f"],
        5,
      );

      patterns.forEach((p) => {
        expect(p.length).toBeGreaterThanOrEqual(5);
      });
    });

    it("retorna array vazio para targetKeys vazias", async () => {
      const patterns = await repository.getPatterns(LAYOUT_ABNT2, [], 2);
      expect(patterns).toHaveLength(0);
    });
  });

  describe("getPatterns - layout US-INTERNATIONAL", () => {
    it("retorna padrões do corpus US-INTERNATIONAL", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_US,
        ["a", "s", "d", "f"],
        2,
      );

      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        expect(p.length).toBeGreaterThanOrEqual(2);
        const hasTarget = ["a", "s", "d", "f"].some((k) => p.includes(k));
        expect(hasTarget).toBe(true);
      });
    });

    it("NÃO inclui frases PT_BR_PHRASES para US-INTERNATIONAL", async () => {
      const patterns = await repository.getPatterns(LAYOUT_US, ["a", "s"], 5);

      // US corpus doesn't have PT_BR_PHRASES, so only words/patterns from US corpus
      // Should not have Portuguese phrases like "para", "com", etc.
      const ptPhrases = patterns.filter(
        (p) => p.includes("para") || p.includes("com"),
      );
      expect(ptPhrases.length).toBe(0);
    });

    it("inclui bigramas comuns em inglês", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_US,
        ["t", "h", "e"],
        2,
      );

      expect(patterns.some((p) => p.includes("th"))).toBe(true);
      expect(patterns.some((p) => p.includes("he"))).toBe(true);
    });
  });

  describe("isolamento por layout", () => {
    it("mesma targetKey em layouts diferentes retorna padrões diferentes", async () => {
      const abnt2Patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s"],
        2,
      );
      const usPatterns = await repository.getPatterns(LAYOUT_US, ["a", "s"], 2);

      // Should have different patterns from different corpuses
      expect(abnt2Patterns).not.toEqual(usPatterns);
    });

    it("corpus ABNT2 contém palavras em português", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "e", "o"],
        3,
      );

      // Should find Portuguese words
      const hasPortuguese = patterns.some((p) =>
        ["para", "com", "que", "uma", "mais"].some((w) => p.includes(w)),
      );
      expect(hasPortuguese).toBe(true);
    });

    it("corpus US-INTERNATIONAL contém palavras em inglês", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_US,
        ["t", "h", "e"],
        3,
      );

      // Should find English words
      const hasEnglish = patterns.some((p) =>
        ["the", "and", "you", "that", "for"].some((w) => p.includes(w)),
      );
      expect(hasEnglish).toBe(true);
    });
  });

  describe("rankByTargetCoverage (privado, testado indiretamente)", () => {
    it("prioritiza padrões com mais targetKeys", async () => {
      const patterns = await repository.getPatterns(
        LAYOUT_ABNT2,
        ["a", "s", "d", "f"],
        2,
      );

      // First pattern should contain most target keys
      const firstPattern = patterns[0] as string;
      const lastPattern = patterns[patterns.length - 1] as string;
      const firstCoverage = ["a", "s", "d", "f"].filter((k) =>
        firstPattern.includes(k),
      ).length;
      const lastCoverage = ["a", "s", "d", "f"].filter((k) =>
        lastPattern.includes(k),
      ).length;

      expect(firstCoverage).toBeGreaterThanOrEqual(lastCoverage);
    });

    it("desempata por comprimento (menor primeiro)", async () => {
      const patterns = await repository.getPatterns(LAYOUT_ABNT2, ["a"], 2);

      // Among patterns with same coverage, shorter should come first
      for (let i = 1; i < Math.min(patterns.length, 10); i++) {
        const prev = patterns[i - 1] as string;
        const curr = patterns[i] as string;
        if (prev.includes("a") && curr.includes("a")) {
          expect(prev.length).toBeLessThanOrEqual(curr.length);
        }
      }
    });
  });
});

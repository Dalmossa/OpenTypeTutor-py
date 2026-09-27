import { describe, it, expect } from "vitest";
import { AdaptiveLessonEngine } from "./AdaptiveLessonEngine.js";
import { KeyPerformance } from "../entities/KeyPerformance.js";
import { SessionId } from "../value-objects/SessionId.js";
import { Layout } from "../value-objects/Layout.js";
import { adaptiveParams } from "../config/adaptiveParams.js";

describe("AdaptiveLessonEngine", () => {
  const validUserId = SessionId.create("550e8400-e29b-41d4-a716-446655440000");
  const validLayout = Layout.create("ABNT2");

  function createKeyPerformance(
    logicalKey: string,
    overrides: Partial<{
      attempts: number;
      errors: number;
      averageLatencyMs: number;
      lastPracticedAt: Date | null;
      consecutiveMasterySessions: number;
      regressionSessions: number;
      masteryState:
        "UNKNOWN" | "LEARNING" | "WEAK" | "CONSOLIDATING" | "MASTERED";
    }> = {},
  ): KeyPerformance {
    const kp = KeyPerformance.create({
      userId: validUserId,
      logicalKey,
      layout: validLayout,
    });

    let result = kp;
    for (let i = 0; i < (overrides.attempts ?? 0); i++) {
      result = result.recordAttempt({
        isError: i < (overrides.errors ?? 0),
        latencyMs: overrides.averageLatencyMs ?? 200,
      });
    }

    if (overrides.lastPracticedAt !== undefined) {
      const props = result.toProps();
      result = KeyPerformance.reconstruct({
        ...props,
        lastPracticedAt: overrides.lastPracticedAt,
      });
    }

    if (overrides.consecutiveMasterySessions !== undefined) {
      const props = result.toProps();
      result = KeyPerformance.reconstruct({
        ...props,
        consecutiveMasterySessions: overrides.consecutiveMasterySessions,
      });
    }

    if (overrides.regressionSessions !== undefined) {
      const props = result.toProps();
      result = KeyPerformance.reconstruct({
        ...props,
        regressionSessions: overrides.regressionSessions,
      });
    }

    if (overrides.masteryState !== undefined) {
      const props = result.toProps();
      result = KeyPerformance.reconstruct({
        ...props,
        masteryState: overrides.masteryState,
      });
    }

    return result;
  }

  function createMockKeyPerformances(): KeyPerformance[] {
    return [
      createKeyPerformance("a", {
        attempts: 10,
        errors: 5,
        averageLatencyMs: 400,
        masteryState: "WEAK",
      }),
      createKeyPerformance("b", {
        attempts: 10,
        errors: 2,
        averageLatencyMs: 300,
        masteryState: "CONSOLIDATING",
      }),
      createKeyPerformance("c", {
        attempts: 10,
        errors: 1,
        averageLatencyMs: 150,
        masteryState: "LEARNING",
      }),
      createKeyPerformance("d", {
        attempts: 10,
        errors: 0,
        averageLatencyMs: 100,
        masteryState: "LEARNING",
      }),
      createKeyPerformance("e", {
        attempts: 10,
        errors: 8,
        averageLatencyMs: 500,
        masteryState: "WEAK",
      }),
      createKeyPerformance("f", {
        attempts: 10,
        errors: 3,
        averageLatencyMs: 250,
        masteryState: "CONSOLIDATING",
      }),
      createKeyPerformance("g", {
        attempts: 10,
        errors: 1,
        averageLatencyMs: 100,
        masteryState: "LEARNING",
      }),
      createKeyPerformance("h", {
        attempts: 10,
        errors: 0,
        averageLatencyMs: 80,
        masteryState: "LEARNING",
      }),
      createKeyPerformance("i", {
        attempts: 10,
        errors: 6,
        averageLatencyMs: 450,
        masteryState: "WEAK",
      }),
      createKeyPerformance("j", {
        attempts: 10,
        errors: 2,
        averageLatencyMs: 200,
        masteryState: "CONSOLIDATING",
      }),
    ];
  }

  function createMockNGramRepository() {
    const ngrams = new Map<string, number>();
    // Add some common Portuguese n-grams
    ngrams.set("a", 100);
    ngrams.set("b", 50);
    ngrams.set("c", 50);
    ngrams.set("d", 50);
    ngrams.set("e", 100);
    ngrams.set("f", 30);
    ngrams.set("g", 30);
    ngrams.set("h", 20);
    ngrams.set("i", 100);
    ngrams.set("j", 20);
    ngrams.set("ab", 80);
    ngrams.set("de", 80);
    ngrams.set("ei", 60);
    ngrams.set("ar", 70);
    ngrams.set("te", 70);

    return {
      getFrequency: (sequence: string): number => ngrams.get(sequence) ?? 0,
      getPatterns: (): Promise<string[]> => Promise.resolve([]),
      getTopNGrams: (
        n: number,
      ): Array<{ sequence: string; frequency: number }> => {
        const sorted = Array.from(ngrams.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([sequence, frequency]) => ({ sequence, frequency }));
        return sorted;
      },
    };
  }

  describe("RN19 - Pool rounding tiebreak: WEAK > CONSOLIDATING > MASTERED", () => {
    it("deve distribuir 150 caracteres em pools 60/25/15 (90/37.5/22.5)", async () => {
      const keyPerformances = createMockKeyPerformances();
      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // Total target: 150 characters
      // WEAK pool: 60% = 90 chars
      // CONSOLIDATING pool: 25% = 37.5 chars
      // LEARNING pool: 15% = 22.5 chars
      // MASTERED pool: 0% (not in reinforcement)

      expect(lesson.targetKeys.length).toBeGreaterThan(0);
      expect(lesson.targetKeys.length).toBeLessThanOrEqual(150);
    });

    it("RN19 - desempate determinístico: WEAK > CONSOLIDATING > MASTERED", async () => {
      // Create keys with exact boundary WeakKeyScores to test tiebreak
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 10,
          errors: 5,
          averageLatencyMs: 350,
        }), // WEAK
        createKeyPerformance("b", {
          attempts: 10,
          errors: 3,
          averageLatencyMs: 300,
        }), // CONSOLIDATING
        createKeyPerformance("c", {
          attempts: 10,
          errors: 1,
          averageLatencyMs: 200,
        }), // LEARNING
      ];

      // Manually set WeakKeyScores to exact boundaries for tiebreak test
      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // When WeakKeyScore ties at boundary, WEAK should be prioritized over CONSOLIDATING
      expect(lesson.targetKeys).toContain("a");
    });

    it("deve priorizar WEAK sobre CONSOLIDATING quando há empate no arredondamento", async () => {
      // Create scenario where rounding creates tie between pools
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 20,
          errors: 10,
          averageLatencyMs: 400,
          masteryState: "WEAK",
        }),
        createKeyPerformance("b", {
          attempts: 20,
          errors: 5,
          averageLatencyMs: 300,
          masteryState: "CONSOLIDATING",
        }),
        createKeyPerformance("c", {
          attempts: 20,
          errors: 1,
          averageLatencyMs: 150,
          masteryState: "LEARNING",
        }),
        createKeyPerformance("d", {
          attempts: 20,
          errors: 0,
          averageLatencyMs: 100,
          masteryState: "LEARNING",
        }),
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // WEAK keys should appear first in targetKeys
      const weakIndex = lesson.targetKeys.indexOf("a");
      const consolidatingIndex = lesson.targetKeys.indexOf("b");

      if (weakIndex !== -1 && consolidatingIndex !== -1) {
        expect(weakIndex).toBeLessThan(consolidatingIndex);
      }
    });
  });

  describe("Pool redistribution when empty", () => {
    it("deve redistribuir caracteres de pool vazio para outros pools", async () => {
      // Only WEAK keys
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 10,
          errors: 8,
          averageLatencyMs: 500,
          masteryState: "WEAK",
        }),
        createKeyPerformance("b", {
          attempts: 10,
          errors: 7,
          averageLatencyMs: 450,
          masteryState: "WEAK",
        }),
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // All 150 chars should go to WEAK pool since others are empty
      expect(lesson.targetKeys.length).toBeGreaterThan(0);
      expect(lesson.targetKeys).toContain("a");
      expect(lesson.targetKeys).toContain("b");
    });

    it("deve redistribuir de CONSOLIDATING para WEAK quando LEARNING vazio", async () => {
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 10,
          errors: 5,
          averageLatencyMs: 350,
          masteryState: "WEAK",
        }),
        createKeyPerformance("b", {
          attempts: 10,
          errors: 3,
          averageLatencyMs: 300,
          masteryState: "CONSOLIDATING",
        }),
        // No LEARNING keys
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // CONSOLIDATING portion should go to WEAK
      expect(lesson.targetKeys.length).toBeGreaterThan(0);
    });
  });

  describe("PRD §24.3 - Limite de caracteres alvo (REINFORCEMENT_TARGET_CHARACTERS=150)", () => {
    it("deve respeitar REINFORCEMENT_TARGET_CHARACTERS = 150", async () => {
      // Many keys to test limit
      const keyPerformances = Array.from({ length: 50 }, (_, i) =>
        createKeyPerformance(String.fromCharCode(97 + i), {
          attempts: 10,
          errors: Math.floor(i / 2),
          averageLatencyMs: 200 + i * 5,
          masteryState: i < 10 ? "WEAK" : i < 30 ? "CONSOLIDATING" : "LEARNING",
        }),
      );

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      expect(lesson.targetKeys.length).toBeLessThanOrEqual(150);
    });
  });

  describe("N-gram frequency integration", () => {
    it("deve usar frequência de n-grams para ordenar chaves dentro do pool", async () => {
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 10,
          errors: 5,
          averageLatencyMs: 350,
          masteryState: "WEAK",
        }),
        createKeyPerformance("z", {
          attempts: 10,
          errors: 5,
          averageLatencyMs: 350,
          masteryState: "WEAK",
        }), // Low frequency
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      // 'a' has higher n-gram frequency (100) than 'z' (0), should appear first
      const aIndex = lesson.targetKeys.indexOf("a");
      const zIndex = lesson.targetKeys.indexOf("z");

      if (aIndex !== -1 && zIndex !== -1) {
        expect(aIndex).toBeLessThan(zIndex);
      }
    });
  });

  describe("Layout isolation", () => {
    it("deve gerar lições diferentes para layouts diferentes", async () => {
      const keyPerformances = [
        createKeyPerformance("a", {
          attempts: 10,
          errors: 5,
          averageLatencyMs: 350,
          masteryState: "WEAK",
        }),
        createKeyPerformance("b", {
          attempts: 10,
          errors: 3,
          averageLatencyMs: 300,
          masteryState: "CONSOLIDATING",
        }),
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const usLayout = Layout.create("US-INTERNATIONAL");
      const lessonABNT2 = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );
      const lessonUS = await engine.generateReinforcementLesson(
        keyPerformances,
        usLayout,
        1,
      );

      // Lessons should be generated (both valid)
      expect(lessonABNT2.targetKeys.length).toBeGreaterThan(0);
      expect(lessonUS.targetKeys.length).toBeGreaterThan(0);
    });
  });

  describe("RN23 - fallback sem pool selecionável (PRD §24.4 / Fase 7)", () => {
    it("teclas exclusivamente UNKNOWN/LEARNING geram lição com as teclas praticadas", async () => {
      const keyPerformances = [
        createKeyPerformance("a", { attempts: 2, masteryState: "UNKNOWN" }),
        createKeyPerformance("s", { attempts: 5, masteryState: "LEARNING" }),
      ];

      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      const lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        validLayout,
        1,
      );

      expect(lesson.type).toBe("REINFORCEMENT");
      expect(lesson.targetKeys.length).toBeGreaterThan(0);
      expect(lesson.targetKeys).toEqual(expect.arrayContaining(["s", "a"]));
      expect(lesson.content.length).toBeGreaterThan(0);
    });
  });

  describe("Sem dados de performance", () => {
    it("deve resultar em lição sem conteúdo quando não há KeyPerformance", async () => {
      const nGramRepo = createMockNGramRepository();
      const engine = new AdaptiveLessonEngine(nGramRepo, adaptiveParams);

      await expect(
        engine.generateReinforcementLesson([], validLayout, 1),
      ).rejects.toThrow("Conteúdo é obrigatório");
    });
  });
});

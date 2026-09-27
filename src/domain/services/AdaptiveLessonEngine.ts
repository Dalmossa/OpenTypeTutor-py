import type { KeyPerformance } from "../entities/KeyPerformance.js";
import type { Layout } from "../value-objects/Layout.js";
import { Lesson } from "../entities/Lesson.js";
import type { INGramRepository } from "../repositories/INGramRepository.js";
import {
  adaptiveParams,
  type AdaptiveParams,
} from "../config/adaptiveParams.js";

const MIN_POOL_WEIGHT_EPSILON = adaptiveParams.MIN_POOL_WEIGHT_EPSILON;
const POOL_REMAINDER_TIE_EPSILON = adaptiveParams.POOL_REMAINDER_TIE_EPSILON;

interface PoolAllocation {
  masteryState: "WEAK" | "CONSOLIDATING" | "LEARNING" | "MASTERED" | "UNKNOWN";
  weight: number;
  targetCount: number;
  keys: KeyPerformance[];
}

export class AdaptiveLessonEngine {
  private static readonly MINIMUM_PATTERN_LENGTH = 1;

  private readonly nGramRepository: INGramRepository;
  private readonly params: AdaptiveParams;

  constructor(
    nGramRepository: INGramRepository,
    params: AdaptiveParams = adaptiveParams,
  ) {
    this.nGramRepository = nGramRepository;
    this.params = params;
  }

  // `userId` não é parâmetro: o corpo nunca o leu, e a identidade do usuário já
  // entrou no motor via `keyPerformances`, que é chaveado por `(userId, layout)`.
  // O `tsconfig` não liga `noUnusedParameters`, então o argumento morto sobreviveu
  // e cobrava um `max-params` (5 > 4) em todo chamadas. A distinção de layout do
  // teste que compara ABNT2 x US-INTERNATIONAL passa pelo `Layout`, não pelo id.
  async generateReinforcementLesson(
    keyPerformances: KeyPerformance[],
    layout: Layout,
    level: number,
    forcedTargetKeys?: string[],
  ): Promise<Lesson> {
    const targetCharacters = this.params.REINFORCEMENT_TARGET_CHARACTERS;

    const targetKeys =
      forcedTargetKeys && forcedTargetKeys.length > 0
        ? [...forcedTargetKeys]
        : this.resolveTargetKeys(keyPerformances, targetCharacters);

    // PRD §25 - conteúdo a partir de padrões linguísticos reais (corpus de frases),
    // aproximando do alvo de caracteres (§24.3). Se o repositório não devolver
    // padrões, cai de volta para as teclas-alvo (sem perder a lição válida).
    const patterns = await this.nGramRepository.getPatterns(
      layout,
      targetKeys,
      AdaptiveLessonEngine.MINIMUM_PATTERN_LENGTH,
    );
    const content = this.generateLessonContent(
      patterns,
      targetKeys,
      targetCharacters,
    );

    return Lesson.create({
      title: `Lição de Reforço - Nível ${String(level)}`,
      content,
      type: "REINFORCEMENT",
      difficulty: "REINFORCEMENT",
      level,
      targetKeys,
      layout,
    });
  }

  private resolveTargetKeys(
    keyPerformances: KeyPerformance[],
    targetCharacters: number,
  ): string[] {
    const pools = this.categorizeIntoPools(keyPerformances);
    const allocations = this.allocateCharacters(pools, targetCharacters);
    const selected = this.selectTargetKeys(allocations);

    if (selected.length > 0) {
      return selected;
    }

    // RN23 (§24.4) - Fallback sem pool selecionável: usuário novo, todas as teclas
    // UNKNOWN/LEARNING. Usa as teclas praticadas, ordenadas por frequência de N-gram.
    return [
      ...new Set(
        keyPerformances
          .map((performance) => performance.logicalKey)
          .sort(
            (a, b) =>
              this.nGramRepository.getFrequency(b) -
              this.nGramRepository.getFrequency(a),
          ),
      ),
    ];
  }

  private categorizeIntoPools(
    keyPerformances: KeyPerformance[],
  ): Map<string, KeyPerformance[]> {
    const pools = new Map<string, KeyPerformance[]>([
      ["WEAK", []],
      ["CONSOLIDATING", []],
      ["LEARNING", []],
      ["MASTERED", []],
      ["UNKNOWN", []],
    ]);

    for (const kp of keyPerformances) {
      const state = kp.masteryState;
      const pool = pools.get(state);
      if (pool) {
        pool.push(kp);
      }
    }

    return pools;
  }

  private allocateCharacters(
    pools: Map<string, KeyPerformance[]>,
    targetCharacters: number,
  ): PoolAllocation[] {
    const nonEmptyPools = this.selectReinforcementPools(pools);

    if (nonEmptyPools.length === 0) {
      return [];
    }

    // Soma na ordem de inserção dos pools, que é a ordem do `Map` de
    // `categorizeIntoPools` — mesma sequência de ponto flutuante do laço original.
    const totalWeight = nonEmptyPools.reduce(
      (sum, pool) => sum + pool.weight,
      0,
    );
    let remainingChars = targetCharacters;

    for (const pool of nonEmptyPools) {
      const baseCount = Math.floor(
        (pool.weight / totalWeight) * targetCharacters,
      );
      pool.targetCount = baseCount;
      remainingChars -= baseCount;
    }

    this.sortByRemainderThenPriority(
      nonEmptyPools,
      totalWeight,
      targetCharacters,
    );

    for (const pool of nonEmptyPools) {
      if (remainingChars <= 0) break;
      const available = pool.keys.length;
      const canAdd = Math.min(remainingChars, available - pool.targetCount);
      if (canAdd > 0) {
        pool.targetCount += canAdd;
        remainingChars -= canAdd;
      }
    }

    return nonEmptyPools;
  }

  private poolWeights(): Record<string, number> {
    const {
      WEAK_POOL_WEIGHT,
      CONSOLIDATING_POOL_WEIGHT,
      MASTERED_POOL_WEIGHT,
    } = this.params;

    return {
      WEAK: WEAK_POOL_WEIGHT,
      CONSOLIDATING: CONSOLIDATING_POOL_WEIGHT,
      MASTERED: MASTERED_POOL_WEIGHT,
      // PRD §24.1 - LEARNING é derivado por subtração, não por parâmetro: é o que
      // sobrar das outras três, e por isso nasce com ruído de ponto flutuante.
      LEARNING:
        1 - WEAK_POOL_WEIGHT - CONSOLIDATING_POOL_WEIGHT - MASTERED_POOL_WEIGHT,
    };
  }

  private selectReinforcementPools(
    pools: Map<string, KeyPerformance[]>,
  ): PoolAllocation[] {
    const weights = this.poolWeights();
    const selected: PoolAllocation[] = [];

    for (const [state, keys] of pools.entries()) {
      // Estado fora dos quatro do §24.1 vira 0, e por isso cai no mesmo
      // `> epsilon` que antes o `undefined` caía: pool ignorado.
      const weight = weights[state] ?? 0;
      // PRD §24.1 - pool derivado (LEARNING = 0%) tem ruído de ponto flutuante
      // após a subtração; peso ~0 é tratado como pool inexistente de reforço.
      if (keys.length > 0 && weight > MIN_POOL_WEIGHT_EPSILON) {
        selected.push({
          masteryState: state as PoolAllocation["masteryState"],
          weight,
          targetCount: 0,
          keys,
        });
      }
    }

    return selected;
  }

  private sortByRemainderThenPriority(
    pools: PoolAllocation[],
    totalWeight: number,
    targetCharacters: number,
  ): void {
    const remainderOf = (pool: PoolAllocation): number => {
      const proportionalShare = (pool.weight / totalWeight) * targetCharacters;
      return proportionalShare - Math.floor(proportionalShare);
    };

    pools.sort((a, b) => {
      const remainderA = remainderOf(a);
      const remainderB = remainderOf(b);

      // RN19 - desempate de arredondamento: primeiro o resto decimal, e na
      // empate de resto (dentro da tolerância) a prioridade do estado do pool.
      if (Math.abs(remainderA - remainderB) > POOL_REMAINDER_TIE_EPSILON) {
        return remainderB - remainderA;
      }

      return (
        this.getPoolPriority(b.masteryState) -
        this.getPoolPriority(a.masteryState)
      );
    });
  }

  private getPoolPriority(state: PoolAllocation["masteryState"]): number {
    const priority: Record<PoolAllocation["masteryState"], number> = {
      WEAK: 3,
      CONSOLIDATING: 2,
      MASTERED: 1,
      LEARNING: 0,
      UNKNOWN: -1,
    };
    return priority[state];
  }

  private selectTargetKeys(allocations: PoolAllocation[]): string[] {
    const targetKeys: string[] = [];

    for (const pool of allocations) {
      const sortedKeys = [...pool.keys].sort((a, b) => {
        const freqA = this.nGramRepository.getFrequency(a.logicalKey);
        const freqB = this.nGramRepository.getFrequency(b.logicalKey);
        return freqB - freqA;
      });

      const toTake = Math.min(pool.targetCount, sortedKeys.length);
      for (let i = 0; i < toTake; i++) {
        const key = sortedKeys[i];
        if (key) targetKeys.push(key.logicalKey);
      }
    }

    return targetKeys;
  }

  private generateLessonContent(
    patterns: string[],
    targetKeys: string[],
    targetCharacters: number,
  ): string {
    if (patterns.length === 0) {
      const uniqueKeys = [...new Set(targetKeys)];
      return uniqueKeys.join(" ");
    }

    let content = "";
    for (const pattern of patterns) {
      if (content.length + pattern.length + 1 > targetCharacters) break;
      content += (content ? " " : "") + pattern;
    }
    return content || targetKeys.join(" ");
  }
}

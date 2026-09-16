import type { KeyPerformance } from '../entities/KeyPerformance.js';
import type { Layout } from '../value-objects/Layout.js';
import type { SessionId } from '../value-objects/SessionId.js';
import { Lesson } from '../entities/Lesson.js';
import type { INGramRepository } from '../repositories/INGramRepository.js';
import { adaptiveParams, type AdaptiveParams } from '../config/adaptiveParams.js';

interface PoolAllocation {
  masteryState: 'WEAK' | 'CONSOLIDATING' | 'LEARNING' | 'MASTERED' | 'UNKNOWN';
  weight: number;
  targetCount: number;
  keys: KeyPerformance[];
}

export class AdaptiveLessonEngine {
  private static readonly MINIMUM_PATTERN_LENGTH = 1;

  private readonly nGramRepository: INGramRepository;
  private readonly params: AdaptiveParams;

  constructor(nGramRepository: INGramRepository, params: AdaptiveParams = adaptiveParams) {
    this.nGramRepository = nGramRepository;
    this.params = params;
  }

  async generateReinforcementLesson(
    userId: SessionId,
    keyPerformances: KeyPerformance[],
    layout: Layout,
    level: number,
    forcedTargetKeys?: string[]
  ): Promise<Lesson> {
    const targetCharacters = this.params.REINFORCEMENT_TARGET_CHARACTERS;

    let targetKeys: string[];

    if (forcedTargetKeys && forcedTargetKeys.length > 0) {
      targetKeys = [...forcedTargetKeys];
    } else {
      const pools = this.categorizeIntoPools(keyPerformances);
      const allocations = this.allocateCharacters(pools, targetCharacters);
      targetKeys = this.selectTargetKeys(allocations);

      // RN23 (§24.4) - Fallback sem pool selecionável: usuário novo, todas as teclas
      // UNKNOWN/LEARNING. Usa as teclas praticadas, ordenadas por frequência de N-gram.
      if (targetKeys.length === 0) {
        targetKeys = [
          ...new Set(
            keyPerformances
              .map(performance => performance.logicalKey)
              .sort(
                (a, b) => this.nGramRepository.getFrequency(b) - this.nGramRepository.getFrequency(a)
              )
          ),
        ];
      }
    }

    // PRD §25 - conteúdo a partir de padrões linguísticos reais (corpus de frases),
    // aproximando do alvo de caracteres (§24.3). Se o repositório não devolver
    // padrões, cai de volta para as teclas-alvo (sem perder a lição válida).
    const patterns = await this.nGramRepository.getPatterns(
      layout,
      targetKeys,
      AdaptiveLessonEngine.MINIMUM_PATTERN_LENGTH
    );
    const content = this.generateLessonContent(patterns, targetKeys, targetCharacters);

    return Lesson.create({
      title: `Lição de Reforço - Nível ${String(level)}`,
      content,
      type: 'REINFORCEMENT',
      difficulty: 'REINFORCEMENT',
      level,
      targetKeys,
      layout,
    });
  }

  private categorizeIntoPools(keyPerformances: KeyPerformance[]): Map<string, KeyPerformance[]> {
    const pools = new Map<string, KeyPerformance[]>([
      ['WEAK', []],
      ['CONSOLIDATING', []],
      ['LEARNING', []],
      ['MASTERED', []],
      ['UNKNOWN', []],
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

  private allocateCharacters(pools: Map<string, KeyPerformance[]>, targetCharacters: number): PoolAllocation[] {
    const weights = {
      WEAK: this.params.WEAK_POOL_WEIGHT,
      CONSOLIDATING: this.params.CONSOLIDATING_POOL_WEIGHT,
      MASTERED: this.params.MASTERED_POOL_WEIGHT,
      LEARNING: 1 - this.params.WEAK_POOL_WEIGHT - this.params.CONSOLIDATING_POOL_WEIGHT - this.params.MASTERED_POOL_WEIGHT,
    };

    const nonEmptyPools: PoolAllocation[] = [];
    let totalWeight = 0;

    for (const [state, keys] of pools.entries()) {
      const weight = weights[state as keyof typeof weights];
      // PRD §24.1 - pools derivados (LEARNING = 0%) podem ter ruído de ponto
      // flutuante após subtração; trata peso ~0 como pool inexistente de reforço.
      if (keys.length > 0 && weight > 0.000001) {
        nonEmptyPools.push({
          masteryState: state as PoolAllocation['masteryState'],
          weight,
          targetCount: 0,
          keys,
        });
        totalWeight += weight;
      }
    }

    if (nonEmptyPools.length === 0) {
      return [];
    }

    let remainingChars = targetCharacters;

    for (const pool of nonEmptyPools) {
      const proportionalShare = (pool.weight / totalWeight) * targetCharacters;
      const baseCount = Math.floor(proportionalShare);
      pool.targetCount = baseCount;
      remainingChars -= baseCount;
    }

    nonEmptyPools.sort((a, b) => {
      const proportionalA = (a.weight / totalWeight) * targetCharacters;
      const proportionalB = (b.weight / totalWeight) * targetCharacters;
      const remainderA = proportionalA - Math.floor(proportionalA);
      const remainderB = proportionalB - Math.floor(proportionalB);

      if (Math.abs(remainderA - remainderB) > 0.0001) {
        return remainderB - remainderA;
      }

      return this.getPoolPriority(b.masteryState) - this.getPoolPriority(a.masteryState);
    });

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

  private getPoolPriority(state: PoolAllocation['masteryState']): number {
    const priority: Record<PoolAllocation['masteryState'], number> = {
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
    targetCharacters: number
  ): string {
    if (patterns.length === 0) {
      const uniqueKeys = [...new Set(targetKeys)];
      return uniqueKeys.join(' ');
    }

    let content = '';
    for (const pattern of patterns) {
      if (content.length + pattern.length + 1 > targetCharacters) break;
      content += (content ? ' ' : '') + pattern;
    }
    return content || targetKeys.join(' ');
  }
}
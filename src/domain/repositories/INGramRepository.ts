import type { Layout } from '../value-objects/Layout.js';

export interface INGramRepository {
  getPatterns(
    layout: Layout,
    targetKeys: string[],
    minimumLength: number
  ): Promise<string[]>;

  getFrequency(sequence: string): number;
}
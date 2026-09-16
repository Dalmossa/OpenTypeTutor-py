import type { INGramRepository } from '../../domain/repositories/INGramRepository.js';
import type { Layout } from '../../domain/value-objects/Layout.js';
import { PT_BR_PHRASES, normalizeAscii } from './phraseCorpus.js';

export class InMemoryNGramRepository implements INGramRepository {
  private static readonly PT_BR_CORPUS: Record<string, string[]> = {
    ABNT2: [
      'a', 's', 'd', 'f', 'j', 'k', 'l', ';',
      'as', 'df', 'jk', 'kl', ';l', 'asdf', 'jkl;',
      'o', 'e', 'a', 'i', 'u', 'os', 'de', 'da', 'do', 'em', 'um', 'para', 'com',
      'que', 'na', 'no', 'se', 'te', 'me', 'nos', 'vos', 'lhe', 'eles', 'elas',
      'este', 'essa', 'isto', 'aquilo', 'aqui', 'ali', 'lá', 'cá',
      'muito', 'pouco', 'todo', 'todo', 'cada', 'qualquer', 'nenhum',
      'bom', 'mau', 'grande', 'pequeno', 'novo', 'velho', 'bonito', 'feio',
      'casa', 'carro', 'livro', 'mesa', 'cadeira', 'porta', 'janela',
      'trabalhar', 'estudar', 'comer', 'beber', 'dormir', 'acordar', 'correr',
      'andar', 'falar', 'ouvir', 'ver', 'ler', 'escrever', 'pensar',
    ],
    'US-INTERNATIONAL': [
      'a', 's', 'd', 'f', 'j', 'k', 'l', ';',
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/',
      'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they',
      'this', 'have', 'from', 'one', 'had', 'by', 'word', 'but', 'not', 'what',
      'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an',
      'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other',
      'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
      'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
      'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first',
      'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down',
      'day', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound',
    ],
  };

  private static readonly MAX_PATTERN_RESULTS = 100;

  private readonly wordsByLayout: Map<string, string[]>;
  private frequencyCache: Map<string, number> = new Map();

  constructor() {
    this.wordsByLayout = new Map(
      Object.entries(InMemoryNGramRepository.PT_BR_CORPUS).map(([layout, words]) => [
        layout,
        words.map(normalizeAscii),
      ])
    );
    this.buildFrequencyCache();
  }

  private buildFrequencyCache(): void {
    for (const words of this.wordsByLayout.values()) {
      for (const pattern of words) {
        InMemoryNGramRepository.countNgrams(pattern, this.frequencyCache);
      }
    }
    for (const phrase of PT_BR_PHRASES) {
      InMemoryNGramRepository.countNgrams(phrase, this.frequencyCache);
    }
  }

  private static countNgrams(pattern: string, cache: Map<string, number>): void {
    for (let i = 0; i < pattern.length; i++) {
      for (let j = i + 1; j <= pattern.length; j++) {
        const ngram = pattern.slice(i, j);
        cache.set(ngram, (cache.get(ngram) ?? 0) + 1);
      }
    }
  }

  getFrequency(sequence: string): number {
    return this.frequencyCache.get(sequence) ?? 0;
  }

  async getPatterns(
    layout: Layout,
    targetKeys: string[],
    minimumLength: number
  ): Promise<string[]> {
    await Promise.resolve();

    const words = this.wordsByLayout.get(layout.value) ?? [];
    // Frases são corpus pt-BR e só fazem sentido no layout com teclado que as digita
    // (caracteres ASCII sem composição).
    const phrases = layout.value === 'ABNT2' ? [...PT_BR_PHRASES] : [];

    const matches = (pool: string[], keys: string[]): string[] =>
      pool.filter(
        pattern =>
          pattern.length >= minimumLength && keys.some(key => pattern.includes(key))
      );

    const phraseMatches = this.rankByTargetCoverage(matches(phrases, targetKeys), targetKeys);
    const wordMatches = matches(words, targetKeys);

    const patterns: string[] = [...phraseMatches];
    const seen = new Set(patterns);
    for (const word of wordMatches) {
      if (!seen.has(word)) {
        patterns.push(word);
        seen.add(word);
      }
    }

    if (patterns.length < 10) {
      patterns.push(...this.generateCombinations(targetKeys, minimumLength));
    }

    return patterns.slice(0, InMemoryNGramRepository.MAX_PATTERN_RESULTS);
  }

  private rankByTargetCoverage(patterns: string[], targetKeys: string[]): string[] {
    const keySet = new Set(targetKeys);
    const coverage = (pattern: string): number =>
      [...keySet].filter(key => pattern.includes(key)).length;

    return [...patterns].sort(
      (a, b) => coverage(b) - coverage(a) || a.length - b.length
    );
  }

  private generateCombinations(keys: string[], length: number): string[] {
    const results: string[] = [];
    if (keys.length === 0) return results;
    for (let i = 0; i < 20; i++) {
      let combination = '';
      for (let j = 0; j < length; j++) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        if (key) combination += key;
      }
      results.push(combination);
    }
    return results;
  }
}
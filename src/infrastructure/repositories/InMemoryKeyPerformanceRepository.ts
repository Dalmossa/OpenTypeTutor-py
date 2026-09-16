import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import type { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import type { Layout } from '../../domain/value-objects/Layout.js';

export class InMemoryKeyPerformanceRepository implements IKeyPerformanceRepository {
  private performances = new Map<string, KeyPerformance>();

  private getKey(userId: SessionId, logicalKey: string, layout: Layout): string {
    return `${userId.value}:${logicalKey}:${layout.value}`;
  }

  async save(performance: KeyPerformance): Promise<void> {
    const key = this.getKey(performance.userId, performance.logicalKey, performance.layout);
    this.performances.set(key, performance);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<KeyPerformance | null> {
    await Promise.resolve();
    return this.performances.get(id.value) ?? null;
  }

  async findByUserId(userId: SessionId): Promise<KeyPerformance[]> {
    await Promise.resolve();
    const results: KeyPerformance[] = [];
    for (const [key, performance] of this.performances.entries()) {
      if (key.startsWith(`${userId.value}:`)) {
        results.push(performance);
      }
    }
    return results;
  }

  async findByUserIdAndLayout(userId: SessionId, layout: Layout): Promise<KeyPerformance[]> {
    await Promise.resolve();
    const results: KeyPerformance[] = [];
    for (const [key, performance] of this.performances.entries()) {
      if (key.startsWith(`${userId.value}:`) && key.endsWith(`:${layout.value}`)) {
        results.push(performance);
      }
    }
    return results;
  }

  async findByUserIdAndLogicalKey(
    userId: SessionId,
    logicalKey: string,
    layout: Layout
  ): Promise<KeyPerformance | null> {
    await Promise.resolve();
    const key = `${userId.value}:${logicalKey}:${layout.value}`;
    return this.performances.get(key) ?? null;
  }

  async findAllByUserId(userId: SessionId): Promise<KeyPerformance[]> {
    await Promise.resolve();
    return this.findByUserId(userId);
  }

  clear(): void {
    this.performances.clear();
  }

  getAll(): KeyPerformance[] {
    return Array.from(this.performances.values());
  }
}
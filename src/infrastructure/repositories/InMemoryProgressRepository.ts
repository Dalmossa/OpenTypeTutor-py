import type { IProgressRepository } from '../../domain/repositories/IProgressRepository.js';
import type { Progress } from '../../domain/entities/Progress.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';

export class InMemoryProgressRepository implements IProgressRepository {
  private progresses = new Map<string, Progress>();

  async save(progress: Progress): Promise<void> {
    this.progresses.set(progress.userId.value, progress);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<Progress | null> {
    await Promise.resolve();
    return this.progresses.get(id.value) ?? null;
  }

  async findByUserId(userId: SessionId): Promise<Progress | null> {
    await Promise.resolve();
    return this.progresses.get(userId.value) ?? null;
  }

  clear(): void {
    this.progresses.clear();
  }

  getAll(): Progress[] {
    return Array.from(this.progresses.values());
  }
}
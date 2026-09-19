import type { IPracticePacingRepository } from '../../domain/repositories/IPracticePacingRepository.js';
import type { PracticePacingState } from '../../domain/entities/PracticePacingState.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';

export class InMemoryPracticePacingRepository implements IPracticePacingRepository {
  private byUserId = new Map<string, PracticePacingState>();

  async findByUserId(userId: SessionId): Promise<PracticePacingState | null> {
    await Promise.resolve();
    return this.byUserId.get(userId.value) ?? null;
  }

  async save(pacing: PracticePacingState): Promise<void> {
    await Promise.resolve();
    this.byUserId.set(pacing.userId.value, pacing);
  }

  clear(): void {
    this.byUserId.clear();
  }

  getAll(): PracticePacingState[] {
    return Array.from(this.byUserId.values());
  }
}
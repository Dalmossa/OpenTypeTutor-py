import type { IProgressRepository } from "../../domain/repositories/IProgressRepository.js";
import type { Progress } from "../../domain/entities/Progress.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";

export class InMemoryProgressRepository implements IProgressRepository {
  private progresses = new Map<string, Progress>();

  async save(progress: Progress): Promise<void> {
    // Remove any existing progress for this user (one progress per user)
    for (const [id, existing] of this.progresses.entries()) {
      if (existing.userId.equals(progress.userId)) {
        this.progresses.delete(id);
      }
    }
    this.progresses.set(progress.id.value, progress);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<Progress | null> {
    await Promise.resolve();
    return this.progresses.get(id.value) ?? null;
  }

  async findByUserId(userId: SessionId): Promise<Progress | null> {
    await Promise.resolve();
    for (const progress of this.progresses.values()) {
      if (progress.userId.equals(userId)) {
        return progress;
      }
    }
    return null;
  }

  async deleteByUserId(userId: SessionId): Promise<void> {
    await Promise.resolve();
    for (const [id, progress] of this.progresses.entries()) {
      if (progress.userId.equals(userId)) {
        this.progresses.delete(id);
      }
    }
  }

  clear(): void {
    this.progresses.clear();
  }

  getAll(): Progress[] {
    return Array.from(this.progresses.values());
  }
}

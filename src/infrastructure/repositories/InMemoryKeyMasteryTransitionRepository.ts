import type { IKeyMasteryTransitionRepository } from "../../domain/repositories/IKeyMasteryTransitionRepository.js";
import type { KeyMasteryTransition } from "../../domain/entities/KeyMasteryTransition.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";

export class InMemoryKeyMasteryTransitionRepository implements IKeyMasteryTransitionRepository {
  private transitions: KeyMasteryTransition[] = [];

  async save(transition: KeyMasteryTransition): Promise<void> {
    await Promise.resolve();
    this.transitions.push(transition);
  }

  async findByUserBetween(
    userId: SessionId,
    fromDate: string,
    toDate: string,
  ): Promise<KeyMasteryTransition[]> {
    await Promise.resolve();
    return this.transitions
      .filter(
        (t) =>
          t.userId.equals(userId) && t.date >= fromDate && t.date <= toDate,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async deleteByUserId(userId: SessionId): Promise<void> {
    await Promise.resolve();
    this.transitions = this.transitions.filter((t) => !t.userId.equals(userId));
  }

  getAll(): KeyMasteryTransition[] {
    return this.transitions;
  }

  clear(): void {
    this.transitions = [];
  }
}

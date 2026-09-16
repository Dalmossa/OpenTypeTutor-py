import type { IProgressCardRepository } from '../../domain/repositories/IProgressCardRepository.js';
import type { ProgressCard } from '../../domain/entities/ProgressCard.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';

export class InMemoryProgressCardRepository implements IProgressCardRepository {
  private cards = new Map<string, ProgressCard[]>();

  async save(card: ProgressCard): Promise<void> {
    const userId = card.userId.value;
    const cards = this.cards.get(userId) ?? [];
    cards.push(card);
    this.cards.set(userId, cards);
    await Promise.resolve();
  }

  async findLatestByUserId(userId: SessionId): Promise<ProgressCard | null> {
    await Promise.resolve();
    const cards = this.cards.get(userId.value);
    if (!cards || cards.length === 0) {
      return null;
    }
    // save() é append em ordem cronológica; em empate de data o último salvo vence
    let latest = cards[0] ?? null;
    for (const card of cards) {
      if (card.date.getTime() >= (latest?.date.getTime() ?? 0)) {
        latest = card;
      }
    }
    return latest;
  }

  clear(): void {
    this.cards.clear();
  }

  getAll(): ProgressCard[] {
    return Array.from(this.cards.values()).flat();
  }
}
import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import type { TypingSession } from '../../domain/entities/TypingSession.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';

export class InMemoryTypingSessionRepository implements ITypingSessionRepository {
  private sessions = new Map<string, TypingSession>();

  async save(session: TypingSession): Promise<void> {
    this.sessions.set(session.id.value, session);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<TypingSession | null> {
    await Promise.resolve();
    return this.sessions.get(id.value) ?? null;
  }

  async findByUserId(userId: SessionId): Promise<TypingSession[]> {
    await Promise.resolve();
    const results: TypingSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId.equals(userId)) {
        results.push(session);
      }
    }
    return results;
  }

  async findCompletedByUserId(userId: SessionId): Promise<TypingSession[]> {
    await Promise.resolve();
    const results: TypingSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId.equals(userId) && session.state === 'COMPLETED') {
        results.push(session);
      }
    }
    return results;
  }

  clear(): void {
    this.sessions.clear();
  }

  getAll(): TypingSession[] {
    return Array.from(this.sessions.values());
  }
}
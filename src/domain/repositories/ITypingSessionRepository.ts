import type { SessionId } from '../value-objects/SessionId.js';
import type { TypingSession } from '../entities/TypingSession.js';

export interface ITypingSessionRepository {
  save(session: TypingSession): Promise<void>;
  findById(id: SessionId): Promise<TypingSession | null>;
  findByUserId(userId: SessionId): Promise<TypingSession[]>;
  findCompletedByUserId(userId: SessionId): Promise<TypingSession[]>;
}
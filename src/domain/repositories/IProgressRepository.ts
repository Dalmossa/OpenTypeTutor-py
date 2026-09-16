import type { SessionId } from '../value-objects/SessionId.js';
import type { Progress } from '../entities/Progress.js';

export interface IProgressRepository {
  save(progress: Progress): Promise<void>;
  findById(id: SessionId): Promise<Progress | null>;
  findByUserId(userId: SessionId): Promise<Progress | null>;
}
import type { SessionId } from '../value-objects/SessionId.js';
import type { PracticePacingState } from '../entities/PracticePacingState.js';

// RN33 - estado de pacing de prática persistido por usuário (RN17: isolamento por userId)
export interface IPracticePacingRepository {
  findByUserId(userId: SessionId): Promise<PracticePacingState | null>;
  save(pacing: PracticePacingState): Promise<void>;
}
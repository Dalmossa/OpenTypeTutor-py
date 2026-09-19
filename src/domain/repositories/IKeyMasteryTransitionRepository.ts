import type { SessionId } from '../value-objects/SessionId.js';
import type { KeyMasteryTransition } from '../entities/KeyMasteryTransition.js';

// Timeline de mudanças de masteryState (RN09/RN10), isolada por userId (RN17).
export interface IKeyMasteryTransitionRepository {
  save(transition: KeyMasteryTransition): Promise<void>;
  findByUserBetween(
    userId: SessionId,
    fromDate: string,
    toDate: string
  ): Promise<KeyMasteryTransition[]>;
}
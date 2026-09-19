import type { SessionId } from "../value-objects/SessionId.js";
import type { KeyMasteryTransition } from "../entities/KeyMasteryTransition.js";

// Timeline de mudanças de masteryState (RN09/RN10), isolada por userId (RN17).
export interface IKeyMasteryTransitionRepository {
  save(transition: KeyMasteryTransition): Promise<void>;
  findByUserBetween(
    userId: SessionId,
    fromDate: string,
    toDate: string,
  ): Promise<KeyMasteryTransition[]>;
  // RN31 - reset de progresso apaga a timeline do usuário (isolado por userId RN17)
  deleteByUserId(userId: SessionId): Promise<void>;
}

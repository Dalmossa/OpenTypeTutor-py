import type { SessionId } from '../value-objects/SessionId.js';
import type { ProgressCard } from '../entities/ProgressCard.js';

// RN27 - Cartão de Progresso é persistido entre sessões e pode ser consultado/copiado
export interface IProgressCardRepository {
  save(card: ProgressCard): Promise<void>;
  findLatestByUserId(userId: SessionId): Promise<ProgressCard | null>;
  deleteByUserId(userId: SessionId): Promise<void>;
}
import type { SessionId } from '../value-objects/SessionId.js';
import type { KeyPerformance } from '../entities/KeyPerformance.js';
import type { Layout } from '../value-objects/Layout.js';

export interface IKeyPerformanceRepository {
  save(performance: KeyPerformance): Promise<void>;
  findById(id: SessionId): Promise<KeyPerformance | null>;
  findByUserId(userId: SessionId): Promise<KeyPerformance[]>;
  findByUserIdAndLayout(userId: SessionId, layout: Layout): Promise<KeyPerformance[]>;
  findByUserIdAndLogicalKey(userId: SessionId, logicalKey: string, layout: Layout): Promise<KeyPerformance | null>;
  findAllByUserId(userId: SessionId): Promise<KeyPerformance[]>;
}
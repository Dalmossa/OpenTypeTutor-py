import type { DataSource, Repository } from 'typeorm';
import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import type { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import type { Layout } from '../../domain/value-objects/Layout.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Layout as LayoutValue } from '../../domain/value-objects/Layout.js';
import { KeyPerformance as KeyPerformanceValue } from '../../domain/entities/KeyPerformance.js';
import { KeyPerformanceEntity, type KeyPerformanceRow } from '../database/entities/index.js';
import { toIsoOrNull, fromIsoOrNull } from './dateTime.js';

function toRow(performance: KeyPerformance): KeyPerformanceRow {
  const props = performance.toProps();
  return {
    id: props.id.value,
    userId: props.userId.value,
    logicalKey: props.logicalKey,
    layout: props.layout.value,
    attempts: props.attempts,
    errors: props.errors,
    averageLatencyMs: props.averageLatencyMs,
    lastPracticedAt: toIsoOrNull(props.lastPracticedAt),
    consecutiveMasterySessions: props.consecutiveMasterySessions,
    regressionSessions: props.regressionSessions,
    masteryState: props.masteryState,
  };
}

function fromRow(row: KeyPerformanceRow): KeyPerformance {
  return KeyPerformanceValue.create({
    id: SessionIdValue.create(row.id),
    userId: SessionIdValue.create(row.userId),
    logicalKey: row.logicalKey,
    layout: LayoutValue.create(row.layout),
    attempts: row.attempts,
    errors: row.errors,
    averageLatencyMs: row.averageLatencyMs,
    lastPracticedAt: fromIsoOrNull(row.lastPracticedAt),
    consecutiveMasterySessions: row.consecutiveMasterySessions,
    regressionSessions: row.regressionSessions,
    masteryState: row.masteryState as KeyPerformance['masteryState'],
  });
}

export class TypeOrmKeyPerformanceRepository implements IKeyPerformanceRepository {
  private readonly repo: Repository<KeyPerformanceRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(KeyPerformanceEntity);
  }

  async save(performance: KeyPerformance): Promise<void> {
    const row = toRow(performance);
    const existing = await this.repo.findOne({
      where: { userId: row.userId, logicalKey: row.logicalKey, layout: row.layout },
    });
    await this.repo.save({ ...row, id: existing?.id ?? row.id });
  }

  async findById(id: SessionId): Promise<KeyPerformance | null> {
    const row = await this.repo.findOne({ where: { id: id.value } });
    return row === null ? null : fromRow(row);
  }

  async findByUserId(userId: SessionId): Promise<KeyPerformance[]> {
    const rows = await this.repo.find({ where: { userId: userId.value } });
    return rows.map(fromRow);
  }

  async findByUserIdAndLayout(userId: SessionId, layout: Layout): Promise<KeyPerformance[]> {
    const rows = await this.repo.find({ where: { userId: userId.value, layout: layout.value } });
    return rows.map(fromRow);
  }

  async findByUserIdAndLogicalKey(userId: SessionId, logicalKey: string, layout: Layout): Promise<KeyPerformance | null> {
    const row = await this.repo.findOne({
      where: { userId: userId.value, logicalKey, layout: layout.value },
    });
    return row === null ? null : fromRow(row);
  }

  async findAllByUserId(userId: SessionId): Promise<KeyPerformance[]> {
    const rows = await this.repo.find({ where: { userId: userId.value } });
    return rows.map(fromRow);
  }
}
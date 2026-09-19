import type { DataSource, Repository } from 'typeorm';
import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import type { TypingSession } from '../../domain/entities/TypingSession.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';
import type { SessionMetricsProps } from '../../domain/entities/SessionMetrics.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Layout as LayoutValue } from '../../domain/value-objects/Layout.js';
import { TypingSession as TypingSessionValue } from '../../domain/entities/TypingSession.js';
import { SessionMetrics as SessionMetricsValue } from '../../domain/entities/SessionMetrics.js';
import { KeystrokeEvent as KeystrokeEventValue } from '../../domain/entities/KeystrokeEvent.js';
import { TypingSessionEntity, type TypingSessionRow } from '../database/entities/index.js';
import { toIsoOrNull, fromIsoOrNull } from './dateTime.js';

function toRow(session: TypingSession): TypingSessionRow {
  const props = session.toJSON();
  return {
    id: props.id.value,
    userId: props.userId.value,
    lessonId: props.lessonId.value,
    layout: props.layout.value,
    state: props.state,
    startedAt: toIsoOrNull(props.startedAt),
    completedAt: toIsoOrNull(props.completedAt),
    activeDurationMs: props.activeDurationMs,
    metrics: props.metrics === null ? null : JSON.stringify(props.metrics.toJSON()),
    keystrokes: JSON.stringify(props.keystrokes.map((keystroke) => keystroke.toJSON())),
    pausedAt: toIsoOrNull(props.pausedAt),
    totalPausedDurationMs: props.totalPausedDurationMs,
  };
}

function fromRow(row: TypingSessionRow): TypingSession {
  return TypingSessionValue.reconstruct({
    id: SessionIdValue.create(row.id),
    userId: SessionIdValue.create(row.userId),
    lessonId: SessionIdValue.create(row.lessonId),
    layout: LayoutValue.create(row.layout),
    state: row.state as TypingSession['state'],
    startedAt: fromIsoOrNull(row.startedAt),
    completedAt: fromIsoOrNull(row.completedAt),
    activeDurationMs: row.activeDurationMs,
    metrics:
      row.metrics === null ? null : SessionMetricsValue.create(JSON.parse(row.metrics) as SessionMetricsProps),
    keystrokes: (JSON.parse(row.keystrokes) as KeystrokeEventProps[]).map((props) => KeystrokeEventValue.create(props)),
    pausedAt: fromIsoOrNull(row.pausedAt),
    totalPausedDurationMs: row.totalPausedDurationMs,
  });
}

export class TypeOrmTypingSessionRepository implements ITypingSessionRepository {
  private readonly repo: Repository<TypingSessionRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(TypingSessionEntity);
  }

  async save(session: TypingSession): Promise<void> {
    await this.repo.save(toRow(session));
  }

  async findById(id: SessionId): Promise<TypingSession | null> {
    const row = await this.repo.findOne({ where: { id: id.value } });
    return row === null ? null : fromRow(row);
  }

  async findByUserId(userId: SessionId): Promise<TypingSession[]> {
    const rows = await this.repo.find({ where: { userId: userId.value }, order: { id: 'ASC' } });
    return rows.map(fromRow);
  }

  async findCompletedByUserId(userId: SessionId): Promise<TypingSession[]> {
    const rows = await this.repo.find({
      where: { userId: userId.value, state: 'COMPLETED' },
      order: { id: 'ASC' },
    });
    return rows.map(fromRow);
  }

  async deleteByUserId(userId: SessionId): Promise<void> {
    await this.repo.delete({ userId: userId.value });
  }
}
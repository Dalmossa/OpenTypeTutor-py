import type { DataSource, Repository } from 'typeorm';
import type { IProgressRepository } from '../../domain/repositories/IProgressRepository.js';
import type { Progress } from '../../domain/entities/Progress.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Progress as ProgressValue } from '../../domain/entities/Progress.js';
import { ProgressEntity, type ProgressRow } from '../database/entities/index.js';
import { toIsoOrNull, fromIsoOrNull } from './dateTime.js';

function toRow(progress: Progress): ProgressRow {
  return {
    id: progress.id.value,
    userId: progress.userId.value,
    currentLessonId: progress.currentLessonId.value,
    currentLevel: progress.currentLevel,
    completedLessons: progress.completedLessons,
    lastCompletedAt: toIsoOrNull(progress.lastCompletedAt),
  };
}

function fromRow(row: ProgressRow): Progress {
  return ProgressValue.create({
    id: SessionIdValue.create(row.id),
    userId: SessionIdValue.create(row.userId),
    currentLessonId: SessionIdValue.create(row.currentLessonId),
    currentLevel: row.currentLevel,
    completedLessons: row.completedLessons,
    lastCompletedAt: fromIsoOrNull(row.lastCompletedAt),
  });
}

export class TypeOrmProgressRepository implements IProgressRepository {
  private readonly repo: Repository<ProgressRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProgressEntity);
  }

  async save(progress: Progress): Promise<void> {
    const row = toRow(progress);
    const existing = await this.repo.findOne({ where: { userId: row.userId } });
    await this.repo.save({ ...row, id: existing?.id ?? row.id });
  }

  async findById(id: SessionId): Promise<Progress | null> {
    const row = await this.repo.findOne({ where: { id: id.value } });
    return row === null ? null : fromRow(row);
  }

  async findByUserId(userId: SessionId): Promise<Progress | null> {
    const row = await this.repo.findOne({ where: { userId: userId.value } });
    return row === null ? null : fromRow(row);
  }
}
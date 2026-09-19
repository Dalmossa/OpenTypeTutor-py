import type { DataSource, Repository } from 'typeorm';
import type { IKeyMasteryTransitionRepository } from '../../domain/repositories/IKeyMasteryTransitionRepository.js';
import type { KeyMasteryTransition } from '../../domain/entities/KeyMasteryTransition.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Layout as LayoutValue } from '../../domain/value-objects/Layout.js';
import { KeyMasteryTransition as KeyMasteryTransitionValue } from '../../domain/entities/KeyMasteryTransition.js';
import { KeyMasteryTransitionEntity, type KeyMasteryTransitionRow } from '../database/entities/index.js';

function toRow(transition: KeyMasteryTransition): KeyMasteryTransitionRow {
  return {
    id: 0,
    userId: transition.userId.value,
    logicalKey: transition.logicalKey,
    layout: transition.layout.value,
    date: transition.date,
    from: transition.from,
    to: transition.to,
  };
}

function fromRow(row: KeyMasteryTransitionRow): KeyMasteryTransition {
  return KeyMasteryTransitionValue.create({
    userId: SessionIdValue.create(row.userId),
    logicalKey: row.logicalKey,
    layout: LayoutValue.create(row.layout),
    date: row.date,
    from: row.from,
    to: row.to,
  });
}

export class TypeOrmKeyMasteryTransitionRepository implements IKeyMasteryTransitionRepository {
  private readonly repo: Repository<KeyMasteryTransitionRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(KeyMasteryTransitionEntity);
  }

  async save(transition: KeyMasteryTransition): Promise<void> {
    const row = toRow(transition);
    delete row.id;
    await this.repo.save(row);
  }

  async findByUserBetween(
    userId: SessionId,
    fromDate: string,
    toDate: string
  ): Promise<KeyMasteryTransition[]> {
    const rows = await this.repo.find({
      where: { userId: userId.value },
      order: { date: 'ASC', id: 'ASC' },
    });
    return rows
      .filter((r) => r.date >= fromDate && r.date <= toDate)
      .map(fromRow);
  }
}
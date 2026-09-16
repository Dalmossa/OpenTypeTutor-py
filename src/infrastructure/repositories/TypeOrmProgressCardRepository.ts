import type { DataSource, Repository } from 'typeorm';
import type { IProgressCardRepository } from '../../domain/repositories/IProgressCardRepository.js';
import type { ProgressCard } from '../../domain/entities/ProgressCard.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { ProgressCard as ProgressCardValue } from '../../domain/entities/ProgressCard.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';
import { ProgressCardEntity, type ProgressCardRow } from '../database/entities/index.js';

function toRow(card: ProgressCard): ProgressCardRow {
  return {
    id: card.id.value,
    userId: card.userId.value,
    date: card.date.toISOString(),
    phase: card.phase.value,
    lessonNumber: card.lessonNumber,
    insecureKeys: JSON.stringify(card.insecureKeys),
    discomfortReported: card.discomfortReported,
    discomfortDetail: card.discomfortDetail,
    nextSessionNote: card.nextSessionNote,
    previousBackspaceCount: card.previousBackspaceCount,
    currentBackspaceCount: card.currentBackspaceCount,
  };
}

function fromRow(row: ProgressCardRow): ProgressCard {
  return ProgressCardValue.create({
    id: SessionIdValue.create(row.id),
    userId: SessionIdValue.create(row.userId),
    date: new Date(row.date),
    phase: PedagogicalPhase.create(row.phase),
    lessonNumber: row.lessonNumber,
    insecureKeys: JSON.parse(row.insecureKeys) as string[],
    discomfortReported: row.discomfortReported,
    ...(row.discomfortDetail !== null ? { discomfortDetail: row.discomfortDetail } : {}),
    nextSessionNote: row.nextSessionNote,
    previousBackspaceCount: row.previousBackspaceCount,
    currentBackspaceCount: row.currentBackspaceCount,
  });
}

export class TypeOrmProgressCardRepository implements IProgressCardRepository {
  private readonly repo: Repository<ProgressCardRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProgressCardEntity);
  }

  async save(card: ProgressCard): Promise<void> {
    await this.repo.save(toRow(card));
  }

  // RN27 - cartão mais recente do usuário, ordenado por data
  async findLatestByUserId(userId: SessionId): Promise<ProgressCard | null> {
    const rows = await this.repo.find({
      where: { userId: userId.value },
      order: { date: 'DESC' },
      take: 1,
    });
    const row = rows[0];
    return row === undefined ? null : fromRow(row);
  }
}
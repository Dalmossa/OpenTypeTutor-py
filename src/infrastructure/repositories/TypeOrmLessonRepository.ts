import type { DataSource, Repository } from 'typeorm';
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { Lesson } from '../../domain/entities/Lesson.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import type { Layout } from '../../domain/value-objects/Layout.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Layout as LayoutValue } from '../../domain/value-objects/Layout.js';
import { PedagogicalPhase as PedagogicalPhaseValue } from '../../domain/value-objects/PedagogicalPhase.js';
import { Lesson as LessonValue } from '../../domain/entities/Lesson.js';
import { LessonEntity, type LessonRow } from '../database/entities/index.js';

function toRow(lesson: Lesson): LessonRow {
  return {
    id: lesson.id.value,
    level: lesson.level,
    title: lesson.title,
    content: lesson.content,
    targetKeys: JSON.stringify(lesson.targetKeys),
    difficulty: lesson.difficulty,
    type: lesson.type,
    layout: lesson.layout.value,
    pedagogicalPhase: lesson.pedagogicalPhase?.value ?? null,
    lessonInPhase: lesson.lessonInPhase,
  };
}

function fromRow(row: LessonRow): Lesson {
  return LessonValue.create({
    id: SessionIdValue.create(row.id),
    level: row.level,
    title: row.title,
    content: row.content,
    targetKeys: JSON.parse(row.targetKeys) as string[],
    difficulty: row.difficulty as Lesson['difficulty'],
    type: row.type as Lesson['type'],
    layout: LayoutValue.create(row.layout),
    ...(row.pedagogicalPhase === null
      ? {}
      : { pedagogicalPhase: PedagogicalPhaseValue.create(row.pedagogicalPhase) }),
    ...(row.lessonInPhase === null ? {} : { lessonInPhase: row.lessonInPhase }),
  });
}

export class TypeOrmLessonRepository implements ILessonRepository {
  private readonly repo: Repository<LessonRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(LessonEntity);
  }

  async save(lesson: Lesson): Promise<void> {
    await this.repo.save(toRow(lesson));
  }

  async findById(id: SessionId): Promise<Lesson | null> {
    const row = await this.repo.findOne({ where: { id: id.value } });
    return row === null ? null : fromRow(row);
  }

  async findByLevelAndLayout(level: number, layout: Layout): Promise<Lesson[]> {
    const rows = await this.repo.find({ where: { level, layout: layout.value } });
    return rows.map(fromRow);
  }

  async findByLevelAndTypeAndLayout(level: number, type: Lesson['type'], layout: Layout): Promise<Lesson[]> {
    const rows = await this.repo.find({ where: { level, type, layout: layout.value } });
    return rows.map(fromRow);
  }

  async findAll(): Promise<Lesson[]> {
    const rows = await this.repo.find();
    return rows.map(fromRow);
  }
}
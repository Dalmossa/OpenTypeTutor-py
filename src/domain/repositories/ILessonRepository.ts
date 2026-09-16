import type { SessionId } from '../value-objects/SessionId.js';
import type { Lesson } from '../entities/Lesson.js';
import type { Layout } from '../value-objects/Layout.js';

export interface ILessonRepository {
  save(lesson: Lesson): Promise<void>;
  findById(id: SessionId): Promise<Lesson | null>;
  findByLevelAndLayout(level: number, layout: Layout): Promise<Lesson[]>;
  findByLevelAndTypeAndLayout(level: number, type: Lesson['type'], layout: Layout): Promise<Lesson[]>;
  findAll(): Promise<Lesson[]>;
}
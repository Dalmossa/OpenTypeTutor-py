import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { Lesson } from '../../domain/entities/Lesson.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import type { Layout } from '../../domain/value-objects/Layout.js';

export class InMemoryLessonRepository implements ILessonRepository {
  private lessons = new Map<string, Lesson>();

  async save(lesson: Lesson): Promise<void> {
    this.lessons.set(lesson.id.value, lesson);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<Lesson | null> {
    await Promise.resolve();
    return this.lessons.get(id.value) ?? null;
  }

  async findByLevelAndLayout(level: number, layout: Layout): Promise<Lesson[]> {
    await Promise.resolve();
    const results: Lesson[] = [];
    for (const lesson of this.lessons.values()) {
      if (lesson.level === level && lesson.layout.equals(layout)) {
        results.push(lesson);
      }
    }
    return results;
  }

  async findByLevelAndTypeAndLayout(
    level: number,
    type: Lesson['type'],
    layout: Layout
  ): Promise<Lesson[]> {
    await Promise.resolve();
    const results: Lesson[] = [];
    for (const lesson of this.lessons.values()) {
      if (lesson.level === level && lesson.type === type && lesson.layout.equals(layout)) {
        results.push(lesson);
      }
    }
    return results;
  }

  async findAll(): Promise<Lesson[]> {
    await Promise.resolve();
    return Array.from(this.lessons.values());
  }

  clear(): void {
    this.lessons.clear();
  }

  getAll(): Lesson[] {
    return Array.from(this.lessons.values());
  }
}
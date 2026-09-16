import { SessionId } from '../value-objects/SessionId.js';

export interface ProgressProps {
  id?: SessionId;
  userId: SessionId;
  currentLessonId: SessionId;
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: Date | null;
}

export interface ProgressDTO {
  id: string;
  userId: string;
  currentLessonId: string;
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: string | null;
}

interface ProgressInternalProps {
  id: SessionId;
  userId: SessionId;
  currentLessonId: SessionId;
  currentLevel: number;
  completedLessons: number;
  lastCompletedAt: Date | null;
}

export class Progress {
  readonly id: SessionId;
  readonly userId: SessionId;
  readonly currentLessonId: SessionId;
  readonly currentLevel: number;
  readonly completedLessons: number;
  readonly lastCompletedAt: Date | null;

  private constructor(props: ProgressInternalProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.currentLessonId = props.currentLessonId;
    this.currentLevel = props.currentLevel;
    this.completedLessons = props.completedLessons;
    this.lastCompletedAt = props.lastCompletedAt;
  }

  static create(props: ProgressProps): Progress {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (!(props.currentLessonId instanceof SessionId)) {
      throw new Error('currentLessonId inválido');
    }

    if (props.currentLevel < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }

    if (props.completedLessons < 0) {
      throw new Error('Completed lessons não pode ser negativo');
    }

    return new Progress({
      id: props.id ?? SessionId.create(),
      userId: props.userId,
      currentLessonId: props.currentLessonId,
      currentLevel: props.currentLevel,
      completedLessons: props.completedLessons,
      lastCompletedAt: props.lastCompletedAt ?? null,
    });
  }

  completeLesson(nextLessonId: SessionId): Progress {
    if (!(nextLessonId instanceof SessionId)) {
      throw new Error('nextLessonId inválido');
    }

    return new Progress({
      ...this.toInternalProps(),
      currentLessonId: nextLessonId,
      completedLessons: this.completedLessons + 1,
      lastCompletedAt: new Date(),
    });
  }

  advanceLevel(): Progress {
    return new Progress({
      ...this.toInternalProps(),
      currentLevel: this.currentLevel + 1,
    });
  }

  setLevel(level: number): Progress {
    if (level < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }
    return new Progress({
      ...this.toInternalProps(),
      currentLevel: level,
    });
  }

  private toInternalProps(): ProgressInternalProps {
    return {
      id: this.id,
      userId: this.userId,
      currentLessonId: this.currentLessonId,
      currentLevel: this.currentLevel,
      completedLessons: this.completedLessons,
      lastCompletedAt: this.lastCompletedAt,
    };
  }

  equals(other: Progress): boolean {
    return this.userId.equals(other.userId);
  }

  toDTO(): ProgressDTO {
    return {
      id: this.id.value,
      userId: this.userId.value,
      currentLessonId: this.currentLessonId.value,
      currentLevel: this.currentLevel,
      completedLessons: this.completedLessons,
      lastCompletedAt: this.lastCompletedAt?.toISOString() ?? null,
    };
  }

  toJSON(): ProgressDTO {
    return this.toDTO();
  }
}
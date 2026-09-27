import type { Progress } from "../entities/Progress.js";
import type { Lesson } from "../entities/Lesson.js";
import { adaptiveParams } from "../config/adaptiveParams.js";

const LESSONS_PER_LEVEL = adaptiveParams.LESSONS_PER_LEVEL;

interface LessonCompletionData {
  practiceTimeMs?: number;
  charactersTyped?: number;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProgressionEngine {
  static completeLesson(
    progress: Progress,
    lesson: Lesson,
    _completionData: LessonCompletionData = {},
  ): Progress {
    // Check if this lesson was already completed (same as current lesson)
    const isAlreadyCompleted = progress.currentLessonId.equals(lesson.id);

    let newProgress = progress;

    // Update current lesson and increment completed count if not already completed
    if (!isAlreadyCompleted) {
      newProgress = newProgress.completeLesson(lesson.id);
    }

    // Check for level advancement
    const completedInCurrentLevel = newProgress.completedLessons;
    const lessonsNeededForNextLevel =
      LESSONS_PER_LEVEL * newProgress.currentLevel;
    if (completedInCurrentLevel >= lessonsNeededForNextLevel) {
      const newLevel = newProgress.currentLevel + 1;
      newProgress = newProgress.setLevel(newLevel);
    }

    return newProgress;
  }

  static getNextLesson(
    progress: Progress,
    availableLessons: Lesson[],
  ): Lesson | null {
    const sortByLessonId = (a: Lesson, b: Lesson): number => {
      return a.id.value.localeCompare(b.id.value);
    };

    const currentLevelLessons = availableLessons
      .filter((l) => l.level === progress.currentLevel)
      .sort(sortByLessonId);

    // Current lesson not in the current level → nothing started yet in this level
    const currentLessonIndex = currentLevelLessons.findIndex((l) =>
      l.id.equals(progress.currentLessonId),
    );
    if (currentLessonIndex === -1) {
      return currentLevelLessons[0] ?? null;
    }

    // Next incomplete lesson in the current level is the one right after the current
    const nextLessonInLevel = currentLevelLessons[currentLessonIndex + 1];
    if (nextLessonInLevel !== undefined) {
      return nextLessonInLevel;
    }

    // Current level fully covered → look at the next level
    const nextLevelLessons = availableLessons
      .filter((l) => l.level === progress.currentLevel + 1)
      .sort(sortByLessonId);

    return nextLevelLessons[0] ?? null;
  }

  static getLevelCompletionRate(
    progress: Progress,
    availableLessons: Lesson[],
  ): number {
    const currentLevelLessons = availableLessons.filter(
      (l) => l.level === progress.currentLevel,
    );

    if (currentLevelLessons.length === 0) {
      return 1;
    }

    // Count completed lessons in current level
    const completedInLevel = Math.min(
      progress.completedLessons,
      currentLevelLessons.length,
    );

    return completedInLevel / currentLevelLessons.length;
  }
}

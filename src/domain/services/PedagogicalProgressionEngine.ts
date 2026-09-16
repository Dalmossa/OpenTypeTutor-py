import type { Lesson } from '../entities/Lesson.js';
import type { ProgressCard } from '../entities/ProgressCard.js';
import type { PedagogicalPhase } from '../value-objects/PedagogicalPhase.js';

export interface NextLessonResult {
  lesson: Lesson | null;
  shouldVaryExercise: boolean;
  reason: 'advance' | 'repeat' | 'vary' | 'complete' | 'no_lessons' | 'pause_discomfort';
}

export class PedagogicalProgressionEngine {
  private readonly lessonsByPhase: Map<string, Lesson[]>;

  constructor(availableLessons: Lesson[]) {
    this.lessonsByPhase = this.groupLessonsByPhase(availableLessons);
  }

  private groupLessonsByPhase(lessons: Lesson[]): Map<string, Lesson[]> {
    const map = new Map<string, Lesson[]>();

    for (const lesson of lessons) {
      if (lesson.pedagogicalPhase && lesson.lessonInPhase) {
        const phaseKey = lesson.pedagogicalPhase.value;
        if (!map.has(phaseKey)) {
          map.set(phaseKey, []);
        }
        const phaseLessons = map.get(phaseKey);
        if (phaseLessons) {
          phaseLessons.push(lesson);
        }
      }
    }

    // Sort lessons within each phase by lessonInPhase
    for (const phaseLessons of map.values()) {
      phaseLessons.sort((a, b) => (a.lessonInPhase ?? 0) - (b.lessonInPhase ?? 0));
    }

    return map;
  }

  // RN25/RN26 - Get next lesson based on ProgressCard
  getNextLesson(progressCard: ProgressCard, confirmsNoLookingAtKeyboard: boolean): NextLessonResult {
    const currentPhase = progressCard.phase;
    const currentLessonNumber = progressCard.lessonNumber;

    const phaseLessons = this.lessonsByPhase.get(currentPhase.value) ?? [];

    // Check if current lesson exists in this phase
    const currentLessonIndex = phaseLessons.findIndex(
      l => l.lessonInPhase === currentLessonNumber
    );

    // If no lessons in this phase or lesson not found, try to find first lesson of phase
    if (phaseLessons.length === 0 || currentLessonIndex === -1) {
      const firstLesson = phaseLessons[0] ?? null;
      return {
        lesson: firstLesson,
        shouldVaryExercise: false,
        reason: firstLesson ? 'advance' : 'no_lessons',
      };
    }

    // RN24/RN28 - Safety rule: discomfort takes priority over everything
    if (progressCard.discomfortReported) {
      const currentLesson = phaseLessons[currentLessonIndex];
      if (currentLesson) {
        return {
          lesson: currentLesson,
          shouldVaryExercise: false,
          reason: 'pause_discomfort',
        };
      }
    }

    // Check if can advance to next lesson
    const canAdvance = progressCard.canAdvance(confirmsNoLookingAtKeyboard);

    if (canAdvance) {
      // Try to get next lesson in same phase
      const nextLessonInPhase = phaseLessons[currentLessonIndex + 1];

      if (nextLessonInPhase) {
        return {
          lesson: nextLessonInPhase,
          shouldVaryExercise: false,
          reason: 'advance',
        };
      }

      // No more lessons in this phase, try next phase
      const nextPhase = currentPhase.getNext();
      if (nextPhase) {
        const nextPhaseLessons = this.lessonsByPhase.get(nextPhase.value) ?? [];
        const firstOfNextPhase = nextPhaseLessons[0] ?? null;
        return {
          lesson: firstOfNextPhase,
          shouldVaryExercise: false,
          reason: firstOfNextPhase ? 'advance' : 'no_lessons',
        };
      }

      // No more phases - curriculum complete
      return {
        lesson: null,
        shouldVaryExercise: false,
        reason: 'complete',
      };
    }

    // Cannot advance - check if should vary exercise (RN29)
    const shouldVary = progressCard.shouldVaryExercise(confirmsNoLookingAtKeyboard);

    // currentLessonIndex is guaranteed to be >= 0 here
    const currentLesson = phaseLessons[currentLessonIndex];
    if (currentLesson) {
      return {
        lesson: currentLesson, // Repeat same lesson
        shouldVaryExercise: shouldVary,
        reason: shouldVary ? 'vary' : 'repeat',
      };
    }

    // Fallback (should not happen if logic is correct)
    return {
      lesson: null,
      shouldVaryExercise: false,
      reason: 'no_lessons',
    };
  }

  // RN24 - Get first lesson for a phase (for initial session)
  getFirstLessonOfPhase(phase: PedagogicalPhase): Lesson | null {
    const phaseLessons = this.lessonsByPhase.get(phase.value) ?? [];
    return phaseLessons[0] ?? null;
  }

  // Get all lessons for a phase
  getLessonsForPhase(phase: PedagogicalPhase): Lesson[] {
    return this.lessonsByPhase.get(phase.value) ?? [];
  }

  // Check if phase has lessons
  hasLessonsForPhase(phase: PedagogicalPhase): boolean {
    const phaseLessons = this.lessonsByPhase.get(phase.value) ?? [];
    return phaseLessons.length > 0;
  }

  // Get lesson by phase and lesson number
  getLessonByPhaseAndNumber(phase: PedagogicalPhase, lessonNumber: number): Lesson | null {
    const phaseLessons = this.lessonsByPhase.get(phase.value) ?? [];
    return phaseLessons.find(l => l.lessonInPhase === lessonNumber) ?? null;
  }
}
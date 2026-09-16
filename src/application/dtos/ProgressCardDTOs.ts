import type { LessonDTO } from '../../domain/entities/Lesson.js';
import type { ProgressCardDTO } from '../../domain/entities/ProgressCard.js';

export interface GetNextPedagogicalLessonInputDTO {
  userId: string;
  confirmsNoLookingAtKeyboard: boolean;
}

export interface GetNextPedagogicalLessonResponseDTO {
  lesson: LessonDTO | null;
  shouldVaryExercise: boolean;
  reason: 'advance' | 'repeat' | 'vary' | 'complete' | 'no_lessons' | 'pause_discomfort';
  progressCard: ProgressCardDTO | null;
}

export interface SubmitProgressCardInputDTO {
  userId: string;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail?: string;
  nextSessionNote: string;
  currentBackspaceCount: number;
}

export interface SubmitProgressCardResponseDTO {
  progressCard: ProgressCardDTO;
}

export interface ErgonomicCheckInput {
  seatHeightOk: boolean;
  lumbarSupportOk: boolean;
  monitorAtEyeLevel: boolean;
  wristSupportOk: boolean;
  discomfortReported: boolean;
  discomfortDetail?: string;
}

export interface CheckErgonomicSafetyResponseDTO {
  safe: boolean;
  guidance: string;
}

export interface StartFirstSessionResponseDTO {
  safe: boolean;
  alreadyStarted: boolean;
  lesson: LessonDTO | null;
  progressCard: ProgressCardDTO | null;
  guidance: string;
}

export interface StartFirstSessionInputDTO extends ErgonomicCheckInput {
  userId: string;
}
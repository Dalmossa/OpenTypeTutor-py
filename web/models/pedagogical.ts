import type { LessonDTO } from "@/models/lesson";

export type PedagogicalReason =
  | "advance"
  | "repeat"
  | "vary"
  | "complete"
  | "no_lessons"
  | "pause_discomfort";

export interface ProgressCardDTO {
  id: string;
  userId: string;
  date: string;
  phase: string;
  lessonNumber: number;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail: string | null;
  nextSessionNote: string;
  previousBackspaceCount: number;
  currentBackspaceCount: number;
}

export interface GetNextPedagogicalLessonResponseDTO {
  lesson: LessonDTO | null;
  shouldVaryExercise: boolean;
  reason: PedagogicalReason;
  progressCard: ProgressCardDTO | null;
}

export interface SubmitProgressCardDTO {
  lessonId: string;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail?: string;
  nextSessionNote: string;
  currentBackspaceCount: number;
}

export interface SubmitProgressCardResponseDTO {
  progressCard: ProgressCardDTO | null;
  advanced: boolean;
}

export interface ErgonomicCheckDTO {
  seatHeightOk: boolean;
  lumbarSupportOk: boolean;
  monitorAtEyeLevel: boolean;
  wristSupportOk: boolean;
  discomfortReported: boolean;
  discomfortDetail?: string;
}

export interface ErgonomicCheckResponseDTO {
  safe: boolean;
  guidance: string;
}

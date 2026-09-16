import type { LessonDTO } from '../../domain/entities/Lesson.js';
import type { LayoutValue } from '../../domain/value-objects/Layout.js';

export type GetLessonResponseDTO = LessonDTO;

export interface ListLessonsDTO {
  level?: number;
  type?: LessonDTO['type'];
  layout?: LayoutValue;
}

export type ListLessonsResponseDTO = LessonDTO[];
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { LessonNotFoundError } from '../../domain/errors/DomainError.js';
import type { GetLessonResponseDTO } from '../dtos/LessonDTOs.js';

export class GetLesson {
  constructor(private readonly lessonRepository: ILessonRepository) {}

  async execute(lessonId: string): Promise<GetLessonResponseDTO> {
    const lesson = await this.lessonRepository.findById(SessionId.create(lessonId));
    if (!lesson) {
      throw new LessonNotFoundError('Lição não encontrada');
    }

    return lesson.toDTO();
  }
}
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import type { ListLessonsDTO, ListLessonsResponseDTO } from '../dtos/LessonDTOs.js';

export class ListLessons {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly profileRepository: IUserProfileRepository
  ) {}

  async execute(authUserId: string, filters: ListLessonsDTO = {}): Promise<ListLessonsResponseDTO> {
    const layout = filters.layout
      ? Layout.create(filters.layout)
      : await this.getActiveLayout(authUserId);

    let lessons;

    if (filters.level !== undefined) {
      lessons = filters.type
        ? await this.lessonRepository.findByLevelAndTypeAndLayout(filters.level, filters.type, layout)
        : await this.lessonRepository.findByLevelAndLayout(filters.level, layout);
    } else {
      const all = await this.lessonRepository.findAll();
      lessons = filters.type
        ? all.filter(l => l.type === filters.type && l.layout.equals(layout))
        : all.filter(l => l.layout.equals(layout));
    }

    return lessons.map(lesson => lesson.toDTO());
  }

  private async getActiveLayout(authUserId: string): Promise<Layout> {
    const profile = await this.profileRepository.findByUserId(SessionId.create(authUserId));
    return profile?.activeLayout ?? Layout.create('ABNT2');
  }
}
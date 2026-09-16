import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { LessonNotFoundError } from '../../domain/errors/DomainError.js';
import type { StartTypingSessionDTO, SessionCommandResponseDTO } from '../dtos/SessionDTOs.js';

export class StartTypingSession {
  constructor(
    private readonly sessionRepository: ITypingSessionRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly profileRepository: IUserProfileRepository
  ) {}

  async execute(dto: StartTypingSessionDTO): Promise<SessionCommandResponseDTO> {
    const userId = SessionId.create(dto.userId);
    const lesson = await this.lessonRepository.findById(SessionId.create(dto.lessonId));
    if (!lesson) {
      throw new LessonNotFoundError('Lição não encontrada');
    }

    const profile = await this.profileRepository.findByUserId(userId);
    const layout = profile?.activeLayout ?? lesson.layout;

    const session = TypingSession.create({
      userId,
      lessonId: lesson.id,
      layout,
    }).start();

    await this.sessionRepository.save(session);

    return { sessionId: session.id.value, state: session.state };
  }
}
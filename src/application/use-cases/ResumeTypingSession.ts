import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { SessionNotFoundError } from '../../domain/errors/DomainError.js';
import { assertSessionOwner, applySessionTransition } from '../services/sessionCommand.js';
import type { SessionCommandDTO, SessionCommandResponseDTO } from '../dtos/SessionDTOs.js';

export class ResumeTypingSession {
  constructor(private readonly sessionRepository: ITypingSessionRepository) {}

  async execute(dto: SessionCommandDTO): Promise<SessionCommandResponseDTO> {
    const session = await this.sessionRepository.findById(SessionId.create(dto.sessionId));
    if (!session) {
      throw new SessionNotFoundError('Sessão não encontrada');
    }

    assertSessionOwner(session, dto.userId);

    const updated = applySessionTransition(session, 'resume');
    await this.sessionRepository.save(updated);

    return { sessionId: updated.id.value, state: updated.state };
  }
}
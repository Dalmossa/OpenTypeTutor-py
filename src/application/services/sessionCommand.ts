import type { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import {
  InvalidSessionTransitionError,
  SessionNotOwnedError,
} from '../../domain/errors/DomainError.js';

export function assertSessionOwner(session: TypingSession, authUserId: string): void {
  if (!session.userId.equals(SessionId.create(authUserId))) {
    throw new SessionNotOwnedError('Sessão não pertence ao usuário autenticado');
  }
}

export type SessionTransition = 'pause' | 'resume' | 'abandon';

export function applySessionTransition(
  session: TypingSession,
  transition: SessionTransition
): TypingSession {
  try {
    return session[transition]();
  } catch {
    throw new InvalidSessionTransitionError('Transição inválida');
  }
}
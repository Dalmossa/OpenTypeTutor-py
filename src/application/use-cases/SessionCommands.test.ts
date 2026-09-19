import { describe, it, expect, beforeEach } from 'vitest';
import { StartTypingSession } from './StartTypingSession.js';
import { PauseTypingSession } from './PauseTypingSession.js';
import { ResumeTypingSession } from './ResumeTypingSession.js';
import { AbandonTypingSession } from './AbandonTypingSession.js';
import { InMemoryTypingSessionRepository } from '../../infrastructure/repositories/InMemoryTypingSessionRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryPracticePacingRepository } from '../../infrastructure/repositories/InMemoryPracticePacingRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import {
  LessonNotFoundError,
  SessionNotFoundError,
  SessionNotOwnedError,
  InvalidSessionTransitionError,
} from '../../domain/errors/DomainError.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';
const UNKNOWN_ID = '550e8400-e29b-41d4-a716-446655440099';

const createLesson = () =>
  Lesson.create({
    id: SessionId.create(LESSON_ID),
    level: 1,
    title: 'Lições Básicas',
    content: 'aaa bbb ccc',
    targetKeys: ['a', 'b', 'c'],
    difficulty: 'GUIDED',
    type: 'PRACTICE',
    layout: Layout.create('ABNT2'),
  });

const createRunningSession = (userId = USER_ID) =>
  TypingSession.create({
    userId: SessionId.create(userId),
    lessonId: SessionId.create(LESSON_ID),
    layout: Layout.create('ABNT2'),
  }).start();

describe('StartTypingSession', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let lessonRepository: InMemoryLessonRepository;
  let profileRepository: InMemoryUserProfileRepository;
  let startTypingSession: StartTypingSession;

  beforeEach(async () => {
    sessionRepository = new InMemoryTypingSessionRepository();
    lessonRepository = new InMemoryLessonRepository();
    profileRepository = new InMemoryUserProfileRepository();
    startTypingSession = new StartTypingSession(
      sessionRepository,
      lessonRepository,
      profileRepository,
      new InMemoryPracticePacingRepository()
    );

    await lessonRepository.save(createLesson());
  });

  describe('PRD §9 - Início de sessão', () => {
    it('deve criar sessão RUNNING para lição existente', async () => {
      const result = await startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID });

      expect(result.state).toBe('RUNNING');
      expect(result.sessionId).toBeDefined();

      const saved = await sessionRepository.findById(SessionId.create(result.sessionId));
      expect(saved?.state).toBe('RUNNING');
      expect(saved?.lessonId.value).toBe(LESSON_ID);
    });

    it('deve usar layout do perfil quando existir', async () => {
      await profileRepository.save(
        UserProfile.create({
          userId: SessionId.create(USER_ID),
          activeLayout: Layout.create('US-INTERNATIONAL'),
        })
      );

      const result = await startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID });
      const saved = await sessionRepository.findById(SessionId.create(result.sessionId));

      expect(saved?.layout.value).toBe('US-INTERNATIONAL');
    });

    it('deve usar layout da lição quando não houver perfil', async () => {
      const result = await startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID });
      const saved = await sessionRepository.findById(SessionId.create(result.sessionId));

      expect(saved?.layout.value).toBe('ABNT2');
    });

    it('deve lançar LESSON_NOT_FOUND para lição inexistente', async () => {
      await expect(
        startTypingSession.execute({ userId: USER_ID, lessonId: UNKNOWN_ID })
      ).rejects.toThrow(LessonNotFoundError);
    });
  });
});

describe('PauseTypingSession', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let pauseTypingSession: PauseTypingSession;

  beforeEach(() => {
    sessionRepository = new InMemoryTypingSessionRepository();
    pauseTypingSession = new PauseTypingSession(sessionRepository);
  });

  it('deve pausar sessão RUNNING', async () => {
    const session = createRunningSession();
    await sessionRepository.save(session);

    const result = await pauseTypingSession.execute({ userId: USER_ID, sessionId: session.id.value });

    expect(result.state).toBe('PAUSED');
  });

  it('RN16/RN17 - deve rejeitar pausar sessão de outro usuário', async () => {
    const session = createRunningSession(OTHER_USER_ID);
    await sessionRepository.save(session);

    await expect(
      pauseTypingSession.execute({ userId: USER_ID, sessionId: session.id.value })
    ).rejects.toThrow(SessionNotOwnedError);
  });

  it('deve lançar SESSION_NOT_FOUND para sessão inexistente', async () => {
    await expect(
      pauseTypingSession.execute({ userId: USER_ID, sessionId: UNKNOWN_ID })
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('deve lançar INVALID_SESSION_TRANSITION para sessão IDLE', async () => {
    const session = TypingSession.create({
      userId: SessionId.create(USER_ID),
      lessonId: SessionId.create(LESSON_ID),
      layout: Layout.create('ABNT2'),
    });
    await sessionRepository.save(session);

    await expect(
      pauseTypingSession.execute({ userId: USER_ID, sessionId: session.id.value })
    ).rejects.toThrow(InvalidSessionTransitionError);
  });
});

describe('ResumeTypingSession', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let resumeTypingSession: ResumeTypingSession;

  beforeEach(() => {
    sessionRepository = new InMemoryTypingSessionRepository();
    resumeTypingSession = new ResumeTypingSession(sessionRepository);
  });

  it('deve retomar sessão PAUSED', async () => {
    const session = createRunningSession().pause();
    await sessionRepository.save(session);

    const result = await resumeTypingSession.execute({ userId: USER_ID, sessionId: session.id.value });

    expect(result.state).toBe('RUNNING');
  });

  it('RN16/RN17 - deve rejeitar retomar sessão de outro usuário', async () => {
    const session = createRunningSession(OTHER_USER_ID).pause();
    await sessionRepository.save(session);

    await expect(
      resumeTypingSession.execute({ userId: USER_ID, sessionId: session.id.value })
    ).rejects.toThrow(SessionNotOwnedError);
  });

  it('deve lançar INVALID_SESSION_TRANSITION para sessão RUNNING', async () => {
    const session = createRunningSession();
    await sessionRepository.save(session);

    await expect(
      resumeTypingSession.execute({ userId: USER_ID, sessionId: session.id.value })
    ).rejects.toThrow(InvalidSessionTransitionError);
  });
});

describe('AbandonTypingSession', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let abandonTypingSession: AbandonTypingSession;

  beforeEach(() => {
    sessionRepository = new InMemoryTypingSessionRepository();
    abandonTypingSession = new AbandonTypingSession(sessionRepository);
  });

  it('deve abandonar sessão RUNNING', async () => {
    const session = createRunningSession();
    await sessionRepository.save(session);

    const result = await abandonTypingSession.execute({ userId: USER_ID, sessionId: session.id.value });

    expect(result.state).toBe('ABANDONED');
  });

  it('RN16/RN17 - deve rejeitar abandonar sessão de outro usuário', async () => {
    const session = createRunningSession(OTHER_USER_ID);
    await sessionRepository.save(session);

    await expect(
      abandonTypingSession.execute({ userId: USER_ID, sessionId: session.id.value })
    ).rejects.toThrow(SessionNotOwnedError);
  });
});
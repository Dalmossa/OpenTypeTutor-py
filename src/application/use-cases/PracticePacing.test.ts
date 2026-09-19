import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StartTypingSession } from './StartTypingSession.js';
import { SubmitTypingSession } from './SubmitTypingSession.js';
import { GetPracticeStatus } from './GetPracticeStatus.js';
import { InMemoryTypingSessionRepository } from '../../infrastructure/repositories/InMemoryTypingSessionRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { InMemoryProgressRepository } from '../../infrastructure/repositories/InMemoryProgressRepository.js';
import { InMemoryPracticePacingRepository } from '../../infrastructure/repositories/InMemoryPracticePacingRepository.js';
import { InMemoryDailyMetricsAggregateRepository } from '../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { PracticePacingState } from '../../domain/entities/PracticePacingState.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { adaptiveParams } from '../../domain/config/adaptiveParams.js';
import { BreakRequiredError } from '../../domain/errors/DomainError.js';
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';

const BLOCK_MS = adaptiveParams.PRACTICE_BLOCK_DURATION_MS;
const BREAK_MS = adaptiveParams.MIN_BREAK_DURATION_MS;
const minutes = (m: number): number => m * 60 * 1000;

const keystroke = (logicalKey: string): KeystrokeEventProps => ({
  expectedKey: logicalKey,
  typedKey: logicalKey,
  physicalKey: `Key${logicalKey.toUpperCase()}`,
  logicalKey,
  eventType: 'CORRECT',
  timestampMs: Math.random() * 1000,
  latencyMs: 100,
  composedCharacter: null,
});

const validEvents: KeystrokeEventProps[] = ['a', 'b', 'c', 'a', 'b', 'c'].map(keystroke);

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

describe('RN33 - Pacing de prática', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let lessonRepository: InMemoryLessonRepository;
  let profileRepository: InMemoryUserProfileRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let progressRepository: InMemoryProgressRepository;
  let pacingRepository: InMemoryPracticePacingRepository;
  let startTypingSession: StartTypingSession;
  let submitTypingSession: SubmitTypingSession;
  let getPracticeStatus: GetPracticeStatus;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00.000Z'));

    sessionRepository = new InMemoryTypingSessionRepository();
    lessonRepository = new InMemoryLessonRepository();
    profileRepository = new InMemoryUserProfileRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    progressRepository = new InMemoryProgressRepository();
    pacingRepository = new InMemoryPracticePacingRepository();

    startTypingSession = new StartTypingSession(
      sessionRepository,
      lessonRepository,
      profileRepository,
      pacingRepository
    );
    submitTypingSession = new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      pacingRepository,
      new InMemoryDailyMetricsAggregateRepository(),
      profileRepository
    );
    getPracticeStatus = new GetPracticeStatus(pacingRepository);

    await lessonRepository.save(createLesson());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('StartTypingSession - blocos e pausa', () => {
    it('cria sessão normalmente quando o bloco não estourou', async () => {
      const result = await startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID });

      expect(result.state).toBe('RUNNING');
    });

    it('BLOCKS a criação de nova sessão quando a pausa é obrigatória', async () => {
      await pacingRepository.save(
        PracticePacingState.create({
          userId: SessionId.create(USER_ID),
          accumulatedActiveMs: BLOCK_MS,
          lastSessionEndedAt: new Date('2026-09-17T12:00:00.000Z'),
        })
      );

      await expect(
        startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID })
      ).rejects.toThrow(BreakRequiredError);
      expect(await sessionRepository.findByUserId(SessionId.create(USER_ID))).toHaveLength(0);
    });

    it('permite criar nova sessão após a pausa completada e zera o bloco', async () => {
      const endedAt = new Date('2026-09-17T11:57:00.000Z');
      await pacingRepository.save(
        PracticePacingState.create({
          userId: SessionId.create(USER_ID),
          accumulatedActiveMs: BLOCK_MS + minutes(2),
          lastSessionEndedAt: endedAt,
        })
      );

      const result = await startTypingSession.execute({ userId: USER_ID, lessonId: LESSON_ID });

      expect(result.state).toBe('RUNNING');
      const saved = await pacingRepository.findByUserId(SessionId.create(USER_ID));
      expect(saved?.accumulatedActiveMs).toBe(0);
    });
  });

  describe('SubmitTypingSession - acumulação de prática ativa', () => {
    it('acumula activeDurationMs da sessão concluída no pacing', async () => {
      const session = TypingSession.create({
        userId: SessionId.create(USER_ID),
        lessonId: SessionId.create(LESSON_ID),
        layout: Layout.create('ABNT2'),
      }).start();
      await sessionRepository.save(session);
      vi.advanceTimersByTime(12000);

      await submitTypingSession.execute({ userId: USER_ID, sessionId: session.id.value, keystrokes: validEvents });

      const saved = await pacingRepository.findByUserId(SessionId.create(USER_ID));
      expect(saved).not.toBeNull();
      expect(saved?.accumulatedActiveMs).toBeGreaterThanOrEqual(11000);
      expect(saved?.lastSessionEndedAt).not.toBeNull();
    });

    it('RN14 - submit duplicado não acumula a sessão duas vezes', async () => {
      const session = TypingSession.create({
        userId: SessionId.create(USER_ID),
        lessonId: SessionId.create(LESSON_ID),
        layout: Layout.create('ABNT2'),
      }).start();
      await sessionRepository.save(session);
      vi.advanceTimersByTime(12000);

      await submitTypingSession.execute({ userId: USER_ID, sessionId: session.id.value, keystrokes: validEvents });
      await submitTypingSession.execute({ userId: USER_ID, sessionId: session.id.value, keystrokes: [] });

      const saved = await pacingRepository.findByUserId(SessionId.create(USER_ID));
      expect(saved?.accumulatedActiveMs).toBeGreaterThanOrEqual(11000);
      expect(saved?.accumulatedActiveMs).toBeLessThan(minutes(1));
    });

    it('RN13 - sessão ABANDONED não acumula prática ativa', async () => {
      const session = TypingSession.create({
        userId: SessionId.create(USER_ID),
        lessonId: SessionId.create(LESSON_ID),
        layout: Layout.create('ABNT2'),
      }).start();
      await sessionRepository.save(session.abandon());
      vi.advanceTimersByTime(12000);

      await expect(
        submitTypingSession.execute({ userId: USER_ID, sessionId: session.id.value, keystrokes: validEvents })
      ).rejects.toThrow();

      expect(await pacingRepository.findByUserId(SessionId.create(USER_ID))).toBeNull();
    });
  });

  describe('GetPracticeStatus', () => {
    it('reporta breakRequired e breakRemainingMs quando a pausa está em curso', async () => {
      // Cerra em 12:00 (tempo fake) com o fim da sessão 2 min atrás → 1 min de pausa ainda a cumprir
      await pacingRepository.save(
        PracticePacingState.create({
          userId: SessionId.create(USER_ID),
          accumulatedActiveMs: BLOCK_MS + minutes(1),
          lastSessionEndedAt: new Date('2026-09-17T11:58:00.000Z'),
        })
      );

      const status = await getPracticeStatus.execute(USER_ID);

      expect(status.accumulatedActiveMs).toBe(BLOCK_MS + minutes(1));
      expect(status.practiceBlockMs).toBe(BLOCK_MS);
      expect(status.minBreakMs).toBe(BREAK_MS);
      expect(status.breakRequired).toBe(true);
      expect(status.breakRemainingMs).toBe(BREAK_MS - minutes(2));
    });

    it('reporta sem pausa para usuário sem estado de pacing', async () => {
      const status = await getPracticeStatus.execute(USER_ID);

      expect(status.breakRequired).toBe(false);
      expect(status.breakRemainingMs).toBe(0);
      expect(status.accumulatedActiveMs).toBe(0);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubmitTypingSession } from './SubmitTypingSession.js';
import { InMemoryTypingSessionRepository } from '../../infrastructure/repositories/InMemoryTypingSessionRepository.js';
import { InMemoryKeyPerformanceRepository } from '../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js';
import { InMemoryProgressRepository } from '../../infrastructure/repositories/InMemoryProgressRepository.js';
import { InMemoryLessonRepository } from '../../infrastructure/repositories/InMemoryLessonRepository.js';
import { InMemoryPracticePacingRepository } from '../../infrastructure/repositories/InMemoryPracticePacingRepository.js';
import { InMemoryDailyMetricsAggregateRepository } from '../../infrastructure/repositories/InMemoryDailyMetricsAggregateRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { Lesson } from '../../domain/entities/Lesson.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';
import {
  SessionNotOwnedError,
  SessionNotFoundError,
  InvalidSessionTransitionError,
} from '../../domain/errors/DomainError.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';

const keystroke = (
  logicalKey: string,
  eventType: KeystrokeEventProps['eventType'],
  timestampMs: number,
  latencyMs: number = 100
): KeystrokeEventProps => ({
  expectedKey: logicalKey,
  typedKey: logicalKey,
  physicalKey: `Key${logicalKey.toUpperCase()}`,
  logicalKey,
  eventType,
  timestampMs,
  latencyMs,
  composedCharacter: null,
});

const validEvents: KeystrokeEventProps[] = [
  keystroke('a', 'CORRECT', 1),
  keystroke('b', 'CORRECT', 2),
  keystroke('c', 'CORRECT', 3),
  keystroke('d', 'CORRECT', 4),
  keystroke('e', 'CORRECT', 5),
  keystroke('a', 'CORRECT', 6),
  keystroke('b', 'CORRECT', 7),
  keystroke('c', 'CORRECT', 8),
  keystroke('a', 'CORRECT', 9),
  keystroke('b', 'CORRECT', 10),
  keystroke('x', 'INCORRECT', 11),
  keystroke('y', 'INCORRECT', 12),
];

describe('SubmitTypingSession', () => {
  let sessionRepository: InMemoryTypingSessionRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let progressRepository: InMemoryProgressRepository;
  let lessonRepository: InMemoryLessonRepository;
  let aggregateRepository: InMemoryDailyMetricsAggregateRepository;
  let userProfileRepository: InMemoryUserProfileRepository;
  let submitTypingSession: SubmitTypingSession;
  let sessionId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    sessionRepository = new InMemoryTypingSessionRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    progressRepository = new InMemoryProgressRepository();
    lessonRepository = new InMemoryLessonRepository();
    aggregateRepository = new InMemoryDailyMetricsAggregateRepository();
    userProfileRepository = new InMemoryUserProfileRepository();

    submitTypingSession = new SubmitTypingSession(
      sessionRepository,
      keyPerformanceRepository,
      progressRepository,
      lessonRepository,
      new InMemoryPracticePacingRepository(),
      aggregateRepository,
      userProfileRepository
    );

    await lessonRepository.save(
      Lesson.create({
        id: SessionId.create(LESSON_ID),
        level: 1,
        title: 'Lições Básicas',
        content: 'aaa bbb ccc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout: Layout.create('ABNT2'),
      })
    );

    const session = TypingSession.create({
      userId: SessionId.create(USER_ID),
      lessonId: SessionId.create(LESSON_ID),
      layout: Layout.create('ABNT2'),
    }).start();
    await sessionRepository.save(session);
    sessionId = session.id.value;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('PRD §12-§15 - Submissão de sessão', () => {
    it('deve marcar sessão como COMPLETED com métricas calculadas', async () => {
      vi.advanceTimersByTime(12000);

      const result = await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      expect(result.state).toBe('COMPLETED');
      expect(result.metrics.charactersTyped).toBe(12);
      expect(result.metrics.finalUncorrectedErrors).toBe(2);
      expect(result.metrics.netWpm).toBeGreaterThan(0);
    });

    it('deve persistir sessão COMPLETED no repositório', async () => {
      vi.advanceTimersByTime(12000);
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const saved = await sessionRepository.findById(SessionId.create(sessionId));
      expect(saved?.state).toBe('COMPLETED');
      expect(saved?.metrics?.charactersTyped).toBe(12);
    });

    it('deve atualizar KeyPerformance por tecla (RN16.2, §16)', async () => {
      vi.advanceTimersByTime(12000);
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const keyA = await keyPerformanceRepository.findByUserIdAndLogicalKey(
        SessionId.create(USER_ID),
        'a',
        Layout.create('ABNT2')
      );
      expect(keyA?.attempts).toBe(3);
      expect(keyA?.errors).toBe(0);

      const keyY = await keyPerformanceRepository.findByUserIdAndLogicalKey(
        SessionId.create(USER_ID),
        'y',
        Layout.create('ABNT2')
      );
      expect(keyY?.attempts).toBe(1);
      expect(keyY?.errors).toBe(1);
    });

    it('deve atualizar Progress com lição concluída', async () => {
      vi.advanceTimersByTime(12000);
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const progress = await progressRepository.findByUserId(SessionId.create(USER_ID));
      expect(progress?.completedLessons).toBe(1);
      expect(progress?.currentLessonId.value).toBe(LESSON_ID);
    });
  });

  describe('RN22 - Dados insuficientes', () => {
    it('não deve calcular WPM para sessão com tempo ativo < 3000ms', async () => {
      vi.advanceTimersByTime(1000);

      const sixEvents = [
        keystroke('a', 'CORRECT', 1),
        keystroke('b', 'CORRECT', 2),
        keystroke('c', 'CORRECT', 3),
        keystroke('a', 'CORRECT', 4),
        keystroke('b', 'CORRECT', 5),
        keystroke('c', 'CORRECT', 6),
      ];

      const result = await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: sixEvents });

      expect(result.metrics.grossWpm).toBe(0);
      expect(result.metrics.netWpm).toBe(0);
    });
  });

  describe('RN14 - Idempotência do submit', () => {
    it('submit duplicado não reprocessa métricas nem efeitos colaterais', async () => {
      vi.advanceTimersByTime(12000);

      const first = await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });
      const second = await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: [] });

      expect(second.metrics).toEqual(first.metrics);

      const keyA = await keyPerformanceRepository.findByUserIdAndLogicalKey(
        SessionId.create(USER_ID),
        'a',
        Layout.create('ABNT2')
      );
      expect(keyA?.attempts).toBe(3);

      const progress = await progressRepository.findByUserId(SessionId.create(USER_ID));
      expect(progress?.completedLessons).toBe(1);
    });

    it('submit duplicado não cria novas KeyPerformance', async () => {
      vi.advanceTimersByTime(12000);
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const allKp = await keyPerformanceRepository.findByUserId(SessionId.create(USER_ID));
      expect(allKp).toHaveLength(7);
    });
  });

  describe('RN16/RN17 - Posse da sessão', () => {
    it('deve rejeitar submit de sessão de outro usuário', async () => {
      await expect(
        submitTypingSession.execute({ userId: OTHER_USER_ID, sessionId, keystrokes: validEvents })
      ).rejects.toThrow(SessionNotOwnedError);
    });
  });

  describe('PRD §9 - Validação de estado', () => {
    it('deve lançar SESSION_NOT_FOUND para sessão inexistente', async () => {
      await expect(
        submitTypingSession.execute({
          userId: USER_ID,
          sessionId: '550e8400-e29b-41d4-a716-446655440099',
          keystrokes: validEvents,
        })
      ).rejects.toThrow(SessionNotFoundError);
    });

    it('RN13 - deve rejeitar submit de sessão ABANDONED', async () => {
      vi.advanceTimersByTime(12000);
      const session = await sessionRepository.findById(SessionId.create(sessionId));
      if (session) {
        await sessionRepository.save(session.abandon());
      }

      await expect(
        submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents })
      ).rejects.toThrow(InvalidSessionTransitionError);
    });
  });

  describe('RN35/RN37 - Agregado diário de métricas', () => {
    it('RN35 - submit popula o agregado diário com contadores e teclas do dia', async () => {
      vi.advanceTimersByTime(12000);

      const result = await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const day = await aggregateRepository.findByKey(
        SessionId.create(USER_ID),
        Layout.create('ABNT2'),
        '2023-12-31' // 2024-01-01T00:00Z em America/Sao_Paulo → dia 31/12/2023 (RN37)
      );
      expect(day).not.toBeNull();
      expect(day?.sessionsCompleted).toBe(1);
      expect(day?.totalGrossChars).toBe(result.metrics.charactersTyped);
      expect(day?.totalCorrectChars).toBe(result.metrics.correctCharacters);
      expect(day?.totalErrors).toBe(result.metrics.incorrectCharacters);
      expect(day?.keysPracticed.sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'x', 'y']);
    });

    it('RN14 - submit duplicado não duplica o agregado diário', async () => {
      vi.advanceTimersByTime(12000);

      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });
      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: [] });

      const day = await aggregateRepository.findByKey(
        SessionId.create(USER_ID),
        Layout.create('ABNT2'),
        '2023-12-31'
      );
      expect(day?.sessionsCompleted).toBe(1);
    });

    it('RN22 - sessão com dados insuficientes não entra no agregado', async () => {
      vi.advanceTimersByTime(1000);

      const sixEvents = [
        keystroke('a', 'CORRECT', 1),
        keystroke('b', 'CORRECT', 2),
        keystroke('c', 'CORRECT', 3),
        keystroke('a', 'CORRECT', 4),
        keystroke('b', 'CORRECT', 5),
        keystroke('c', 'CORRECT', 6),
      ];

      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: sixEvents });

      const day = await aggregateRepository.findByKey(
        SessionId.create(USER_ID),
        Layout.create('ABNT2'),
        '2023-12-31'
      );
      expect(day).toBeNull();
    });

    it('RN37 - data do agregado respeita o fuso do perfil do usuário', async () => {
      vi.advanceTimersByTime(12000);
      await userProfileRepository.save(
        UserProfile.create({ userId: SessionId.create(USER_ID), timezone: 'Pacific/Kiritimati' })
      );

      await submitTypingSession.execute({ userId: USER_ID, sessionId, keystrokes: validEvents });

      const utcDay = await aggregateRepository.findByKey(
        SessionId.create(USER_ID),
        Layout.create('ABNT2'),
        '2023-12-31'
      );
      expect(utcDay).toBeNull();

      const kiritimatiDay = await aggregateRepository.findByKey(
        SessionId.create(USER_ID),
        Layout.create('ABNT2'),
        '2024-01-01'
      );
      expect(kiritimatiDay?.sessionsCompleted).toBe(1);
    });
  });

  describe('RN12 - Correção não cria novo erro', () => {
    it('CORRECTION não incrementa tentativas nem erros de KeyPerformance', async () => {
      vi.advanceTimersByTime(12000);

      const eventsWithCorrection: KeystrokeEventProps[] = [
        keystroke('a', 'CORRECT', 1),
        keystroke('x', 'INCORRECT', 2),
        keystroke('x', 'CORRECTION', 3),
      ];

      const result = await submitTypingSession.execute({
        userId: USER_ID,
        sessionId,
        keystrokes: eventsWithCorrection,
      });

      expect(result.metrics.correctedErrors).toBe(1);
      expect(result.metrics.finalUncorrectedErrors).toBe(0);

      const keyX = await keyPerformanceRepository.findByUserIdAndLogicalKey(
        SessionId.create(USER_ID),
        'x',
        Layout.create('ABNT2')
      );
      expect(keyX?.attempts).toBe(1);
      expect(keyX?.errors).toBe(1);
    });
  });
});
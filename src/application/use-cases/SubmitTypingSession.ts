import type { ITypingSessionRepository } from '../../domain/repositories/ITypingSessionRepository.js';
import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import type { IProgressRepository } from '../../domain/repositories/IProgressRepository.js';
import type { ILessonRepository } from '../../domain/repositories/ILessonRepository.js';
import type { IPracticePacingRepository } from '../../domain/repositories/IPracticePacingRepository.js';
import type { TypingSession } from '../../domain/entities/TypingSession.js';
import { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { KeystrokeEvent } from '../../domain/entities/KeystrokeEvent.js';
import { Progress } from '../../domain/entities/Progress.js';
import { PracticePacingState } from '../../domain/entities/PracticePacingState.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { MetricsEngine } from '../../domain/services/MetricsEngine.js';
import { ProgressionEngine } from '../../domain/services/ProgressionEngine.js';
import { adaptiveParams } from '../../domain/config/adaptiveParams.js';
import {
  InvalidSessionTransitionError,
  SessionNotFoundError,
} from '../../domain/errors/DomainError.js';
import { assertSessionOwner } from '../services/sessionCommand.js';
import type { SubmitTypingSessionDTO, SubmitTypingSessionResponseDTO } from '../dtos/SessionDTOs.js';
import type { Clock } from '../dtos/PracticePacingDTOs.js';

export class SubmitTypingSession {
  constructor(
    private readonly sessionRepository: ITypingSessionRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository,
    private readonly progressRepository: IProgressRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly pacingRepository: IPracticePacingRepository,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(dto: SubmitTypingSessionDTO): Promise<SubmitTypingSessionResponseDTO> {
    const session = await this.sessionRepository.findById(SessionId.create(dto.sessionId));
    if (!session) {
      throw new SessionNotFoundError('Sessão não encontrada');
    }

    assertSessionOwner(session, dto.userId);

    // RN14 - Submit idempotente: sessão COMPLETED retorna resultado cacheado, sem reprocessar
    if (session.state === 'COMPLETED') {
      return this.toResponse(session);
    }

    // RN13 - Sessões ABANDONED jamais produzem atualização de desempenho/progresso
    if (session.state === 'ABANDONED') {
      throw new InvalidSessionTransitionError('Sessão abandonada não pode ser submetida');
    }

    const events = dto.keystrokes.map(keystroke => KeystrokeEvent.create(keystroke));
    const sessionWithEvents = session.recordKeystrokes(events);

    const completedSession = sessionWithEvents.complete(MetricsEngine.calculate(sessionWithEvents));
    const metrics = MetricsEngine.calculate(completedSession);
    const finalizedSession = completedSession.setMetrics(metrics);

    await this.applyKeystrokePerformance(sessionWithEvents);
    await this.advanceProgress(sessionWithEvents);

    await this.sessionRepository.save(finalizedSession);

    // RN33 - acumula a prática ativa da sessão concluída apenas na primeira conclusão (RN14).
    // ABANDONED jamais chega aqui (RN13).
    const pacing =
      (await this.pacingRepository.findByUserId(session.userId)) ??
      PracticePacingState.create({ userId: session.userId });
    await this.pacingRepository.save(
      pacing.recordCompletedSession(metrics.activeDurationMs, this.now())
    );

    return this.toResponse(finalizedSession);
  }

  private async applyKeystrokePerformance(session: TypingSession): Promise<void> {
    const pendingByKey = new Map<string, KeyPerformance>();

    for (const keystroke of session.keystrokes) {
      if (keystroke.isControlKey()) continue;
      if (keystroke.eventType !== 'CORRECT' && keystroke.eventType !== 'INCORRECT') continue;

      const keyId = `${keystroke.logicalKey}:${session.layout.value}`;
      const existing =
        pendingByKey.get(keyId) ??
        (await this.keyPerformanceRepository.findByUserIdAndLogicalKey(
          session.userId,
          keystroke.logicalKey,
          session.layout
        )) ??
        KeyPerformance.create({
          userId: session.userId,
          logicalKey: keystroke.logicalKey,
          layout: session.layout,
        });

      pendingByKey.set(
        keyId,
        existing.recordAttempt({
          isError: keystroke.eventType === 'INCORRECT',
          latencyMs: keystroke.latencyMs ?? 0,
        })
      );
    }

    for (const performance of pendingByKey.values()) {
      const isMasteryApproved =
        performance.keyAccuracy >= adaptiveParams.MASTERY_ACCURACY &&
        performance.averageLatencyMs <= adaptiveParams.MASTERY_LATENCY_MS;

      const withSessionEnd = performance.recordSessionEnd(isMasteryApproved);
      await this.keyPerformanceRepository.save(withSessionEnd);
    }
  }

  private async advanceProgress(session: TypingSession): Promise<void> {
    const lesson = await this.lessonRepository.findById(session.lessonId);
    if (!lesson) return;

    let progress = await this.progressRepository.findByUserId(session.userId);
    if (!progress) {
      progress = Progress.create({
        userId: session.userId,
        currentLessonId: SessionId.create(),
        currentLevel: lesson.level,
        completedLessons: 0,
        lastCompletedAt: null,
      });
    }

    const updatedProgress = ProgressionEngine.completeLesson(progress, lesson);
    await this.progressRepository.save(updatedProgress);
  }

  private toResponse(session: TypingSession): SubmitTypingSessionResponseDTO {
    const metrics = session.metrics ?? MetricsEngine.calculate(session);
    return {
      sessionId: session.id.value,
      state: 'COMPLETED',
      metrics: metrics.toJSON(),
    };
  }
}
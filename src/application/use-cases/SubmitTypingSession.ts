import type { ITypingSessionRepository } from "../../domain/repositories/ITypingSessionRepository.js";
import type { IKeyPerformanceRepository } from "../../domain/repositories/IKeyPerformanceRepository.js";
import type { IProgressRepository } from "../../domain/repositories/IProgressRepository.js";
import type { ILessonRepository } from "../../domain/repositories/ILessonRepository.js";
import type { IPracticePacingRepository } from "../../domain/repositories/IPracticePacingRepository.js";
import type { IDailyMetricsAggregateRepository } from "../../domain/repositories/IDailyMetricsAggregateRepository.js";
import type { IKeyMasteryTransitionRepository } from "../../domain/repositories/IKeyMasteryTransitionRepository.js";
import type { IUserProfileRepository } from "../../domain/repositories/IUserProfileRepository.js";
import type { TypingSession } from "../../domain/entities/TypingSession.js";
import { KeyPerformance } from "../../domain/entities/KeyPerformance.js";
import type { MasteryState } from "../../domain/entities/KeyPerformance.js";
import { KeystrokeEvent } from "../../domain/entities/KeystrokeEvent.js";
import { Progress } from "../../domain/entities/Progress.js";
import { PracticePacingState } from "../../domain/entities/PracticePacingState.js";
import { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import { KeyMasteryTransition } from "../../domain/entities/KeyMasteryTransition.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Timezone } from "../../domain/value-objects/Timezone.js";
import { MetricsEngine } from "../../domain/services/MetricsEngine.js";
import { ProgressionEngine } from "../../domain/services/ProgressionEngine.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";
import {
  InvalidSessionTransitionError,
  SessionNotFoundError,
} from "../../domain/errors/DomainError.js";
import { assertSessionOwner } from "../services/sessionCommand.js";
import type {
  SubmitTypingSessionDTO,
  SubmitTypingSessionResponseDTO,
} from "../dtos/SessionDTOs.js";
import type { Clock } from "../dtos/PracticePacingDTOs.js";

export class SubmitTypingSession {
  constructor(
    private readonly sessionRepository: ITypingSessionRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository,
    private readonly progressRepository: IProgressRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly pacingRepository: IPracticePacingRepository,
    private readonly aggregateRepository: IDailyMetricsAggregateRepository,
    private readonly userProfileRepository: IUserProfileRepository,
    private readonly masteryTransitionRepository: IKeyMasteryTransitionRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async execute(
    dto: SubmitTypingSessionDTO,
  ): Promise<SubmitTypingSessionResponseDTO> {
    const session = await this.sessionRepository.findById(
      SessionId.create(dto.sessionId),
    );
    if (!session) {
      throw new SessionNotFoundError("Sessão não encontrada");
    }

    assertSessionOwner(session, dto.userId);

    // RN14 - Submit idempotente: sessão COMPLETED retorna resultado cacheado, sem reprocessar
    if (session.state === "COMPLETED") {
      return this.toResponse(session);
    }

    // RN13 - Sessões ABANDONED jamais produzem atualização de desempenho/progresso
    if (session.state === "ABANDONED") {
      throw new InvalidSessionTransitionError(
        "Sessão abandonada não pode ser submetida",
      );
    }

    const events = dto.keystrokes.map((keystroke) =>
      KeystrokeEvent.create(keystroke),
    );
    const sessionWithEvents = session.recordKeystrokes(events);

    const completedSession = sessionWithEvents.complete(
      MetricsEngine.calculate(sessionWithEvents),
    );
    const metrics = MetricsEngine.calculate(completedSession);
    const finalizedSession = completedSession.setMetrics(metrics);

    const localDate = await this.resolveLocalDate(session.userId);
    await this.applyKeystrokePerformance(sessionWithEvents, localDate);
    await this.advanceProgress(sessionWithEvents);

    await this.sessionRepository.save(finalizedSession);

    // RN33 - acumula a prática ativa da sessão concluída apenas na primeira conclusão (RN14).
    // ABANDONED jamais chega aqui (RN13).
    const pacing =
      (await this.pacingRepository.findByUserId(session.userId)) ??
      PracticePacingState.create({ userId: session.userId });
    await this.pacingRepository.save(
      pacing.recordCompletedSession(metrics.activeDurationMs, this.now()),
    );

    // RN34 - registra lição completada para macro-pacing (após progresso avançar)
    const lesson = await this.lessonRepository.findById(session.lessonId);
    if (lesson) {
      const updatedPacing =
        (await this.pacingRepository.findByUserId(session.userId)) ??
        PracticePacingState.create({ userId: session.userId });
      await this.pacingRepository.save(
        updatedPacing.recordLessonCompleted(this.now()),
      );
    }

    await this.applyDailyAggregate(sessionWithEvents, metrics, localDate);

    return this.toResponse(finalizedSession);
  }

  // RN37 - chave do dia calendário local do usuário (default America/Sao_Paulo)
  private async resolveLocalDate(userId: SessionId): Promise<string> {
    const profile = await this.userProfileRepository.findByUserId(userId);
    const timezone =
      profile !== null
        ? Timezone.create({ value: profile.timezone })
        : Timezone.createDefault();
    return timezone.toLocalDateKey(this.now());
  }

  // RN35 - mantém o agregado diário pré-computado por (userId, layout, date local RN37).
  // RN14: idempotente — sessões COMPLETED retornam cacheado lá em cima; RN13/RN22: ABANDONED e
  // dados insuficientes (RN22) não entram no agregado.
  private async applyDailyAggregate(
    session: TypingSession,
    metrics: ReturnType<typeof MetricsEngine.calculate>,
    localDate: string,
  ): Promise<void> {
    if (
      metrics.activeDurationMs <
        adaptiveParams.INSUFFICIENT_DATA_MIN_DURATION_MS ||
      metrics.charactersTyped < adaptiveParams.INSUFFICIENT_DATA_MIN_CHARS
    ) {
      return;
    }

    const keys = session.keystrokes
      .filter((keystroke) => !keystroke.isControlKey())
      .map((keystroke) => keystroke.logicalKey);

    const existing =
      (await this.aggregateRepository.findByKey(
        session.userId,
        session.layout,
        localDate,
      )) ??
      DailyMetricsAggregate.create({
        userId: session.userId,
        layout: session.layout,
        date: localDate,
      });

    await this.aggregateRepository.save(existing.merge(metrics, keys));
  }

  private async applyKeystrokePerformance(
    session: TypingSession,
    localDate: string,
  ): Promise<void> {
    const pendingByKey = new Map<string, KeyPerformance>();
    const baselineStates = new Map<string, MasteryState>();

    for (const keystroke of session.keystrokes) {
      if (keystroke.isControlKey()) continue;
      if (
        keystroke.eventType !== "CORRECT" &&
        keystroke.eventType !== "INCORRECT"
      )
        continue;

      const keyId = `${keystroke.logicalKey}:${session.layout.value}`;
      const existing =
        pendingByKey.get(keyId) ??
        (await this.keyPerformanceRepository.findByUserIdAndLogicalKey(
          session.userId,
          keystroke.logicalKey,
          session.layout,
        )) ??
        KeyPerformance.create({
          userId: session.userId,
          logicalKey: keystroke.logicalKey,
          layout: session.layout,
        });

      // RN09/RN10 - estado persistido antes da sessão (baseline para detectar transição)
      if (!baselineStates.has(keyId)) {
        baselineStates.set(keyId, existing.masteryState);
      }

      pendingByKey.set(
        keyId,
        existing.recordAttempt({
          isError: keystroke.eventType === "INCORRECT",
          latencyMs: keystroke.latencyMs ?? 0,
        }),
      );
    }

    for (const performance of pendingByKey.values()) {
      const isMasteryApproved =
        performance.keyAccuracy >= adaptiveParams.MASTERY_ACCURACY &&
        performance.averageLatencyMs <= adaptiveParams.MASTERY_LATENCY_MS;

      const withSessionEnd = performance.recordSessionEnd(isMasteryApproved);
      await this.keyPerformanceRepository.save(withSessionEnd);

      // RN09/RN10 - timeline: persiste a transição somente quando o masteryState persistido
      // muda no fim da sessão (ADR-020). `from` = estado carregado antes da sessão.
      const keyId = `${performance.logicalKey}:${session.layout.value}`;
      const from = baselineStates.get(keyId);
      if (from !== undefined && from !== withSessionEnd.masteryState) {
        await this.masteryTransitionRepository.save(
          KeyMasteryTransition.create({
            userId: session.userId,
            logicalKey: performance.logicalKey,
            layout: session.layout,
            date: localDate,
            from,
            to: withSessionEnd.masteryState,
          }),
        );
      }
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
      state: "COMPLETED",
      // RN22 - a flag vai explícita porque o cliente precisa da decisão. Ele
      // antes a rederivava dos números com literais próprios; com o motor no
      // backend, mudar `adaptiveParams` muda a tela junto, e não só o banco.
      metrics: {
        ...metrics.toJSON(),
        insufficientData: metrics.isInsufficientData(),
      },
    };
  }
}

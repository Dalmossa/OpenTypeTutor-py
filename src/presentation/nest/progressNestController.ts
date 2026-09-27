import {
  Controller,
  Delete,
  Get,
  Inject,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { GetUserKeyPerformanceResponseDTO } from "../../application/dtos/KeyPerformanceDTOs.js";
import type {
  GetUserProgressResponseDTO,
  ResetProgressResponseDTO,
} from "../../application/dtos/ProgressDTOs.js";
import type { LessonDTO } from "../../domain/entities/Lesson.js";
import type {
  PracticeStatusDTO,
  LessonPacingStatusDTO,
} from "../../application/dtos/PracticePacingDTOs.js";
import type { LessonPerformanceDTO } from "../../application/dtos/LessonPerformanceDTOs.js";
import type {
  GetLessonPerformancePort,
  GetLessonPacingStatusPort,
  GetPracticeStatusPort,
  GetReinforcementLessonPort,
  GetUserKeyPerformancePort,
  GetUserProgressPort,
  ResetProgressPort,
} from "../ports/useCasePorts.js";
import { AuthGuard, getRequestUserId } from "./auth.guard.js";
import { TOKENS } from "./nestTokens.js";

@Controller("/me")
@UseGuards(AuthGuard)
export class ProgressNestController {
  constructor(
    @Inject(TOKENS.GET_REINFORCEMENT_LESSON)
    private readonly reinforcementLesson: GetReinforcementLessonPort,
    @Inject(TOKENS.GET_USER_PROGRESS)
    private readonly userProgress: GetUserProgressPort,
    @Inject(TOKENS.GET_USER_KEY_PERFORMANCE)
    private readonly keyPerformance: GetUserKeyPerformancePort,
    @Inject(TOKENS.RESET_PROGRESS)
    private readonly resetProgress: ResetProgressPort,
    @Inject(TOKENS.GET_PRACTICE_STATUS)
    private readonly practiceStatus: GetPracticeStatusPort,
    @Inject(TOKENS.GET_LESSON_PERFORMANCE)
    private readonly lessonPerformance: GetLessonPerformancePort,
    @Inject(TOKENS.GET_LESSON_PACING_STATUS)
    private readonly lessonPacing: GetLessonPacingStatusPort,
  ) {}

  @Get("reinforcement-lesson")
  async reinforcement(@Req() req: Request): Promise<LessonDTO> {
    const userId = getRequestUserId(req);
    return this.reinforcementLesson.execute(userId);
  }

  @Get("progress")
  async progress(@Req() req: Request): Promise<GetUserProgressResponseDTO> {
    const userId = getRequestUserId(req);
    return this.userProgress.execute(userId);
  }

  // RN31 - limpa o progresso do usuário autenticado e volta ao nível 1
  @Delete("progress")
  async reset(@Req() req: Request): Promise<ResetProgressResponseDTO> {
    const userId = getRequestUserId(req);
    return this.resetProgress.execute(userId);
  }

  @Get("key-performance")
  async keyPerf(
    @Req() req: Request,
  ): Promise<GetUserKeyPerformanceResponseDTO> {
    const userId = getRequestUserId(req);
    return this.keyPerformance.execute(userId);
  }

  // RN33 - estado de pacing (acumulado, limites e pausa restante) para a UI cronometrar
  @Get("practice-status")
  async pacing(@Req() req: Request): Promise<PracticeStatusDTO> {
    const userId = getRequestUserId(req);
    return this.practiceStatus.execute(userId);
  }

  // RN32 - status visual por lição (NOT_STARTED/MASTERED/REVIEW/PRACTICING)
  @Get("lessons/performance")
  async lessonsPerformance(
    @Req() req: Request,
  ): Promise<LessonPerformanceDTO[]> {
    const userId = getRequestUserId(req);
    return this.lessonPerformance.execute(userId);
  }

  // RN34 - macro-pausa: lições acumuladas contra o limiar e pausa restante.
  // Distinto de `practice-status` (RN33), que é o bloco de prática por tempo.
  @Get("lesson-pacing")
  async lessonPacingStatus(
    @Req() req: Request,
  ): Promise<LessonPacingStatusDTO> {
    const userId = getRequestUserId(req);
    return this.lessonPacing.execute(userId);
  }
}

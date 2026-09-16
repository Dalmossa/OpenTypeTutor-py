import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { GetUserKeyPerformanceResponseDTO } from '../../application/dtos/KeyPerformanceDTOs.js';
import type { GetUserProgressResponseDTO } from '../../application/dtos/ProgressDTOs.js';
import type { LessonDTO } from '../../domain/entities/Lesson.js';
import type {
  GetReinforcementLessonPort,
  GetUserKeyPerformancePort,
  GetUserProgressPort,
} from '../ports/useCasePorts.js';
import { AuthGuard, getRequestUserId } from './auth.guard.js';
import { TOKENS } from './nestTokens.js';

@Controller()
@UseGuards(AuthGuard)
export class ProgressNestController {
  constructor(
    @Inject(TOKENS.GET_REINFORCEMENT_LESSON) private readonly reinforcementLesson: GetReinforcementLessonPort,
    @Inject(TOKENS.GET_USER_PROGRESS) private readonly userProgress: GetUserProgressPort,
    @Inject(TOKENS.GET_USER_KEY_PERFORMANCE) private readonly keyPerformance: GetUserKeyPerformancePort
  ) {}

  @Get('reinforcement-lesson')
  async reinforcement(@Req() req: Request): Promise<LessonDTO> {
    const userId = getRequestUserId(req);
    return this.reinforcementLesson.execute(userId);
  }

  @Get('progress')
  async progress(@Req() req: Request): Promise<GetUserProgressResponseDTO> {
    const userId = getRequestUserId(req);
    return this.userProgress.execute(userId);
  }

  @Get('key-performance')
  async keyPerf(@Req() req: Request): Promise<GetUserKeyPerformanceResponseDTO> {
    const userId = getRequestUserId(req);
    return this.keyPerformance.execute(userId);
  }
}
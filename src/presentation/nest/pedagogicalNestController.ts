import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type {
  CheckErgonomicSafetyResponseDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardResponseDTO,
} from '../../application/dtos/ProgressCardDTOs.js';
import type {
  CheckErgonomicSafetyPort,
  GetNextPedagogicalLessonPort,
  SubmitProgressCardPort,
} from '../ports/useCasePorts.js';
import {
  ergonomicCheckSchema,
  nextLessonQuerySchema,
  submitProgressCardSchema,
} from '../validators/pedagogicalValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { AuthGuard, getRequestUserId } from './auth.guard.js';
import { TOKENS } from './nestTokens.js';

@Controller('/me')
@UseGuards(AuthGuard)
export class PedagogicalNestController {
  constructor(
    @Inject(TOKENS.GET_NEXT_PEDAGOGICAL_LESSON) private readonly nextLesson: GetNextPedagogicalLessonPort,
    @Inject(TOKENS.SUBMIT_PROGRESS_CARD) private readonly submitCard: SubmitProgressCardPort,
    @Inject(TOKENS.CHECK_ERGONOMIC_SAFETY) private readonly checkErgonomicSafety: CheckErgonomicSafetyPort
  ) {}

  @Get('pedagogical-lesson')
  async next(@Req() req: Request, @Query() query: Record<string, string | undefined>): Promise<GetNextPedagogicalLessonResponseDTO> {
    const userId = getRequestUserId(req);
    const { confirmsNoLookingAtKeyboard } = parseSchema(nextLessonQuerySchema, query);
    return this.nextLesson.execute({ userId, confirmsNoLookingAtKeyboard });
  }

  @Post('progress-card')
  @HttpCode(201)
  async submit(@Req() req: Request, @Body() body: unknown): Promise<SubmitProgressCardResponseDTO> {
    const userId = getRequestUserId(req);
    const parsed = parseSchema(submitProgressCardSchema, body);
    return this.submitCard.execute({
      userId,
      insecureKeys: parsed.insecureKeys,
      discomfortReported: parsed.discomfortReported,
      nextSessionNote: parsed.nextSessionNote,
      currentBackspaceCount: parsed.currentBackspaceCount,
      ...(parsed.discomfortDetail !== undefined ? { discomfortDetail: parsed.discomfortDetail } : {}),
    });
  }

  @Post('ergonomic-check')
  @HttpCode(201)
  ergonomic(@Body() body: unknown): Promise<CheckErgonomicSafetyResponseDTO> {
    const parsed = parseSchema(ergonomicCheckSchema, body);
    return this.checkErgonomicSafety.execute({
      seatHeightOk: parsed.seatHeightOk,
      lumbarSupportOk: parsed.lumbarSupportOk,
      monitorAtEyeLevel: parsed.monitorAtEyeLevel,
      wristSupportOk: parsed.wristSupportOk,
      discomfortReported: parsed.discomfortReported,
      ...(parsed.discomfortDetail !== undefined ? { discomfortDetail: parsed.discomfortDetail } : {}),
    });
  }
}
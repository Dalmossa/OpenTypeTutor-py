import { Body, Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionCommandResponseDTO, SubmitTypingSessionResponseDTO } from '../../application/dtos/SessionDTOs.js';
import type {
  SessionCommandPort,
  StartSessionPort,
  SubmitSessionPort,
} from '../ports/useCasePorts.js';
import {
  sessionIdParamsSchema,
  startSessionSchema,
  submitSessionSchema,
  toKeystrokeProps,
} from '../validators/sessionValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { AuthGuard, getRequestUserId } from './auth.guard.js';
import { TOKENS } from './nestTokens.js';

@Controller('/sessions')
@UseGuards(AuthGuard)
export class SessionNestController {
  constructor(
    @Inject(TOKENS.START_SESSION) private readonly startSession: StartSessionPort,
    @Inject(TOKENS.PAUSE_SESSION) private readonly pauseSession: SessionCommandPort,
    @Inject(TOKENS.RESUME_SESSION) private readonly resumeSession: SessionCommandPort,
    @Inject(TOKENS.ABANDON_SESSION) private readonly abandonSession: SessionCommandPort,
    @Inject(TOKENS.SUBMIT_SESSION) private readonly submitSession: SubmitSessionPort
  ) {}

  @Post()
  @HttpCode(201)
  async start(@Req() req: Request, @Body() body: unknown): Promise<SessionCommandResponseDTO> {
    const userId = getRequestUserId(req);
    const parsed = parseSchema(startSessionSchema, body);
    return this.startSession.execute({ userId, lessonId: parsed.lessonId });
  }

  @Post(':sessionId/pause')
  @HttpCode(200)
  async pause(@Req() req: Request, @Param() params: Record<string, string>): Promise<SessionCommandResponseDTO> {
    const { userId, sessionId } = this.commandInputs(req, params);
    return this.pauseSession.execute({ userId, sessionId });
  }

  @Post(':sessionId/resume')
  @HttpCode(200)
  async resume(@Req() req: Request, @Param() params: Record<string, string>): Promise<SessionCommandResponseDTO> {
    const { userId, sessionId } = this.commandInputs(req, params);
    return this.resumeSession.execute({ userId, sessionId });
  }

  @Post(':sessionId/abandon')
  @HttpCode(200)
  async abandon(@Req() req: Request, @Param() params: Record<string, string>): Promise<SessionCommandResponseDTO> {
    const { userId, sessionId } = this.commandInputs(req, params);
    return this.abandonSession.execute({ userId, sessionId });
  }

  @Post(':sessionId/submit')
  @HttpCode(200)
  async submit(@Req() req: Request, @Param() params: Record<string, string>, @Body() body: unknown): Promise<SubmitTypingSessionResponseDTO> {
    const { userId, sessionId } = this.commandInputs(req, params);
    const parsed = parseSchema(submitSessionSchema, body);
    const keystrokes = parsed.keystrokes.map(toKeystrokeProps);
    return this.submitSession.execute({ userId, sessionId, keystrokes });
  }

  private commandInputs(req: Request, params: Record<string, string>): { userId: string; sessionId: string } {
    const userId = getRequestUserId(req);
    const { sessionId } = parseSchema(sessionIdParamsSchema, params);
    return { userId, sessionId };
  }
}
import type { Request, Response } from 'express';
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
import { getAuthUserId } from '../middlewares/authMiddleware.js';

export class SessionController {
  constructor(
    private readonly startSession: StartSessionPort,
    private readonly pauseSession: SessionCommandPort,
    private readonly resumeSession: SessionCommandPort,
    private readonly abandonSession: SessionCommandPort,
    private readonly submitSession: SubmitSessionPort
  ) {}

  async start(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const body = parseSchema(startSessionSchema, req.body);
    const result = await this.startSession.execute({ userId, lessonId: body.lessonId });
    res.status(201).json(result);
  }

  async pause(req: Request, res: Response): Promise<void> {
    const { userId, sessionId } = this.commandInputs(req);
    const result = await this.pauseSession.execute({ userId, sessionId });
    res.json(result);
  }

  async resume(req: Request, res: Response): Promise<void> {
    const { userId, sessionId } = this.commandInputs(req);
    const result = await this.resumeSession.execute({ userId, sessionId });
    res.json(result);
  }

  async abandon(req: Request, res: Response): Promise<void> {
    const { userId, sessionId } = this.commandInputs(req);
    const result = await this.abandonSession.execute({ userId, sessionId });
    res.json(result);
  }

  async submit(req: Request, res: Response): Promise<void> {
    const { userId, sessionId } = this.commandInputs(req);
    const body = parseSchema(submitSessionSchema, req.body);
    const keystrokes = body.keystrokes.map(toKeystrokeProps);
    const result = await this.submitSession.execute({ userId, sessionId, keystrokes });
    res.json(result);
  }

  private commandInputs(req: Request): { userId: string; sessionId: string } {
    const userId = getAuthUserId(req);
    const { sessionId } = parseSchema(sessionIdParamsSchema, req.params);
    return { userId, sessionId };
  }
}
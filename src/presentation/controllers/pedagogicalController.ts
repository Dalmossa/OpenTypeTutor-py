import type { Request, Response } from 'express';
import type {
  CheckErgonomicSafetyPort,
  GetNextPedagogicalLessonPort,
  SubmitProgressCardPort,
} from '../ports/useCasePorts.js';
import { getAuthUserId } from '../middlewares/authMiddleware.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import {
  ergonomicCheckSchema,
  nextLessonQuerySchema,
  submitProgressCardSchema,
} from '../validators/pedagogicalValidators.js';

export class PedagogicalController {
  constructor(
    private readonly getNextPedagogicalLesson: GetNextPedagogicalLessonPort,
    private readonly submitProgressCard: SubmitProgressCardPort,
    private readonly checkErgonomicSafety: CheckErgonomicSafetyPort
  ) {}

  async nextLesson(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const { confirmsNoLookingAtKeyboard } = parseSchema(nextLessonQuerySchema, req.query);
    const result = await this.getNextPedagogicalLesson.execute({ userId, confirmsNoLookingAtKeyboard });
    res.json(result);
  }

  async submitCard(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const body = parseSchema(submitProgressCardSchema, req.body);
    const result = await this.submitProgressCard.execute({
      userId,
      insecureKeys: body.insecureKeys,
      discomfortReported: body.discomfortReported,
      nextSessionNote: body.nextSessionNote,
      currentBackspaceCount: body.currentBackspaceCount,
      ...(body.discomfortDetail !== undefined ? { discomfortDetail: body.discomfortDetail } : {}),
    });
    res.status(201).json(result);
  }

  async ergonomicCheck(req: Request, res: Response): Promise<void> {
    const body = parseSchema(ergonomicCheckSchema, req.body);
    const result = await this.checkErgonomicSafety.execute({
      seatHeightOk: body.seatHeightOk,
      lumbarSupportOk: body.lumbarSupportOk,
      monitorAtEyeLevel: body.monitorAtEyeLevel,
      wristSupportOk: body.wristSupportOk,
      discomfortReported: body.discomfortReported,
      ...(body.discomfortDetail !== undefined ? { discomfortDetail: body.discomfortDetail } : {}),
    });
    res.status(201).json(result);
  }
}
import type { Request, Response } from 'express';
import type { ListLessonsDTO } from '../../application/dtos/LessonDTOs.js';
import type { GetLessonPort, ListLessonsPort } from '../ports/useCasePorts.js';
import { lessonIdParamsSchema, listLessonsQuerySchema } from '../validators/lessonValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { getAuthUserId } from '../middlewares/authMiddleware.js';

export class LessonController {
  constructor(
    private readonly listLessons: ListLessonsPort,
    private readonly getLesson: GetLessonPort
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const parsed = parseSchema(listLessonsQuerySchema, req.query);
    const filters: ListLessonsDTO = {
      ...(parsed.level !== undefined ? { level: parsed.level } : {}),
      ...(parsed.type !== undefined ? { type: parsed.type } : {}),
      ...(parsed.layout !== undefined ? { layout: parsed.layout } : {}),
    };
    const result = await this.listLessons.execute(userId, filters);
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = parseSchema(lessonIdParamsSchema, req.params);
    const result = await this.getLesson.execute(id);
    res.json(result);
  }
}
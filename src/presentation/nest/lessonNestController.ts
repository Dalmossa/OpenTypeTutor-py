import { Controller, Get, Inject, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { ListLessonsDTO } from '../../application/dtos/LessonDTOs.js';
import type { LessonDTO } from '../../domain/entities/Lesson.js';
import type { GetLessonPort, ListLessonsPort } from '../ports/useCasePorts.js';
import { lessonIdParamsSchema, listLessonsQuerySchema } from '../validators/lessonValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { AuthGuard, getRequestUserId } from './auth.guard.js';
import { TOKENS } from './nestTokens.js';

@Controller('/lessons')
@UseGuards(AuthGuard)
export class LessonNestController {
  constructor(
    @Inject(TOKENS.LIST_LESSONS) private readonly listLessons: ListLessonsPort,
    @Inject(TOKENS.GET_LESSON) private readonly getLesson: GetLessonPort
  ) {}

  @Get()
  async list(@Req() req: Request, @Query() query: Record<string, string | undefined>): Promise<LessonDTO[]> {
    const userId = getRequestUserId(req);
    const parsed = parseSchema(listLessonsQuerySchema, query);
    const filters: ListLessonsDTO = {
      ...(parsed.level !== undefined ? { level: parsed.level } : {}),
      ...(parsed.type !== undefined ? { type: parsed.type } : {}),
      ...(parsed.layout !== undefined ? { layout: parsed.layout } : {}),
    };
    return this.listLessons.execute(userId, filters);
  }

  @Get(':id')
  async getById(@Param() params: Record<string, string>): Promise<LessonDTO> {
    const { id } = parseSchema(lessonIdParamsSchema, params);
    return this.getLesson.execute(id);
  }
}
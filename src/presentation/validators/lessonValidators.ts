import { z } from 'zod';

export const listLessonsQuerySchema = z.object({
  level: z.coerce.number().int().min(1).optional(),
  type: z.enum(['INTRODUCTION', 'PRACTICE', 'REINFORCEMENT', 'ASSESSMENT']).optional(),
  layout: z.enum(['ABNT2', 'US-INTERNATIONAL']).optional(),
});

export const lessonIdParamsSchema = z
  .object({
    id: z.uuidv4(),
  })
  .strict();
import { z } from 'zod';

export const nextLessonQuerySchema = z
  .object({
    confirmsNoLookingAtKeyboard: z.enum(['true', 'false']).transform(v => v === 'true'),
  })
  .strict();

export const submitProgressCardSchema = z
  .object({
    insecureKeys: z.array(z.string().min(1)),
    discomfortReported: z.boolean(),
    discomfortDetail: z.string().min(1).max(500).optional(),
    nextSessionNote: z.string().min(1).max(2000),
    currentBackspaceCount: z.number().int().nonnegative(),
  })
  .strict();

export const ergonomicCheckSchema = z
  .object({
    seatHeightOk: z.boolean(),
    lumbarSupportOk: z.boolean(),
    monitorAtEyeLevel: z.boolean(),
    wristSupportOk: z.boolean(),
    discomfortReported: z.boolean(),
    discomfortDetail: z.string().min(1).max(500).optional(),
  })
  .strict();
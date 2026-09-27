import { z } from "zod";

export const updateAdminSettingsSchema = z
  .object({
    macroBreakEnabled: z.boolean().optional(),
    macroLessonsThreshold: z.number().int().positive().optional(),
    macroBreakDurationMs: z.number().int().positive().optional(),
    microBlockDurationMs: z.number().int().positive().optional(),
    microBreakDurationMs: z.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser informado para atualização",
  });

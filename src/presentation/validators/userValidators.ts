import { z } from 'zod';

export const updateLayoutSchema = z
  .object({
    layout: z.enum(['ABNT2', 'US-INTERNATIONAL']),
  })
  .strict();
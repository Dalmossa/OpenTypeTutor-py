import { z } from 'zod';
import type { KeystrokeEventProps } from '../../domain/entities/KeystrokeEvent.js';

const keystrokeSchema = z
  .object({
    expectedKey: z.string().min(1),
    typedKey: z.string().nullable().optional(),
    physicalKey: z.string().min(1),
    logicalKey: z.string().min(1),
    eventType: z.enum(['CORRECT', 'INCORRECT', 'CORRECTION', 'DEAD_KEY_COMPOSE']),
    timestampMs: z.number().int().nonnegative(),
    latencyMs: z.number().nonnegative().nullable().optional(),
    composedCharacter: z.string().nullable().optional(),
  })
  .strict();

export const startSessionSchema = z
  .object({
    lessonId: z.uuidv4(),
  })
  .strict();

export const submitSessionSchema = z
  .object({
    keystrokes: z.array(keystrokeSchema),
  })
  .strict();

export const sessionIdParamsSchema = z
  .object({
    sessionId: z.uuidv4(),
  })
  .strict();

export type ParsedKeystroke = z.infer<typeof keystrokeSchema>;

export function toKeystrokeProps(keystroke: ParsedKeystroke): KeystrokeEventProps {
  return {
    expectedKey: keystroke.expectedKey,
    typedKey: keystroke.typedKey ?? null,
    physicalKey: keystroke.physicalKey,
    logicalKey: keystroke.logicalKey,
    eventType: keystroke.eventType,
    timestampMs: keystroke.timestampMs,
    latencyMs: keystroke.latencyMs ?? null,
    composedCharacter: keystroke.composedCharacter ?? null,
  };
}
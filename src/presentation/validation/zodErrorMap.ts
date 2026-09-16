import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';

type ZodIssueShape = {
  code?: unknown;
  format?: unknown;
  origin?: unknown;
};

export function ptBrErrorMap(issue: ZodIssueShape): { message: string } | string {
  switch (issue.code) {
    case 'invalid_type':
      return { message: 'Campo com tipo inválido' };
    case 'invalid_format':
      if (issue.format === 'email') {
        return { message: 'Email inválido' };
      }
      if (issue.format === 'uuid') {
        return { message: 'Identificador inválido' };
      }
      return { message: 'Formato inválido' };
    case 'invalid_value':
      return { message: 'Valor inválido para o campo' };
    case 'too_small':
      return issue.origin === 'string'
        ? { message: 'Texto muito curto para o campo' }
        : { message: 'Valor muito baixo para o campo' };
    case 'too_big':
      return issue.origin === 'string'
        ? { message: 'Texto muito longo para o campo' }
        : { message: 'Valor muito alto para o campo' };
    case 'unrecognized_keys':
      return { message: 'Campo desconhecido na requisição' };
    default:
      return { message: 'Dados inválidos' };
  }
}

z.config({ customError: ptBrErrorMap });

export function parseSchema<Output>(schema: z.ZodType<Output>, input: unknown): Output {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw createValidationAppError(result.error);
  }
  return result.data;
}

export function createValidationAppError(error: z.ZodError): AppError {
  return new AppError('VALIDATION_ERROR', 'Dados inválidos', 422, {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    })),
  });
}
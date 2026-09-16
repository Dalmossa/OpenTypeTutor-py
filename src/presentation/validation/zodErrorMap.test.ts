import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { AppError } from '../../shared/errors/AppError.js';
import { parseSchema } from './zodErrorMap.js';

interface ValidationDetails {
  issues?: Array<{ path: string; code: string; message: string }>;
}

function captureError(action: () => unknown): AppError {
  try {
    action();
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Esperava-se que action lançasse AppError');
}

describe('TASK-070 - Zod com mensagens pt-BR', () => {
  it('email inválido devolve VALIDATION_ERROR 422 com mensagem pt-BR e path', () => {
    const schema = z.object({ email: z.email() });
    const error = captureError(() => parseSchema(schema, { email: 'nao-e-email' }));

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Dados inválidos');
    const details = error.details as ValidationDetails;
    expect(details.issues?.[0]).toMatchObject({ path: 'email', message: 'Email inválido' });
  });

  it('campo obrigatório ausente deixa mensagem de tipo inválido em pt-BR', () => {
    const schema = z.object({ email: z.email() });
    const error = captureError(() => parseSchema(schema, {}));

    expect(error.statusCode).toBe(422);
    const details = error.details as ValidationDetails;
    expect(details.issues?.[0]?.path).toBe('email');
    expect(details.issues?.[0]?.message).toBe('Campo com tipo inválido');
  });

  it('valor abaixo do mínimo numérico devolve mensagem pt-BR', () => {
    const schema = z.object({ level: z.number().min(1) });
    const error = captureError(() => parseSchema(schema, { level: 0 }));

    const details = error.details as ValidationDetails;
    expect(details.issues?.[0]).toMatchObject({ path: 'level', message: 'Valor muito baixo para o campo' });
  });

  it('UUID inválido devolve mensagem pt-BR', () => {
    const schema = z.object({ id: z.uuidv4() });
    const error = captureError(() => parseSchema(schema, { id: 'abc' }));

    const details = error.details as ValidationDetails;
    expect(details.issues?.[0]).toMatchObject({ path: 'id', message: 'Identificador inválido' });
  });

  it('campo extra em schema strict devolve mensagem pt-BR (PRD §13.1 - userId nunca é fonte de verdade)', () => {
    const schema = z.object({ lessonId: z.uuidv4() }).strict();
    const error = captureError(() =>
      parseSchema(schema, { lessonId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', userId: 'outro' })
    );

    const details = error.details as ValidationDetails;
    expect(details.issues?.[0]).toMatchObject({ message: 'Campo desconhecido na requisição' });
  });
});
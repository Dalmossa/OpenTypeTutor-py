import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SessionNotOwnedError } from '../../domain/errors/DomainError.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toAppError } from './toAppError.js';

class RefreshTokenExpiredError extends Error {
  readonly code = 'REFRESH_TOKEN_EXPIRED';
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenExpiredError';
  }
}

describe('TASK-072 - mapeamento de erros para o catálogo (RNF02)', () => {
  it('DomainError SESSION_NOT_OWNED → 403 com mensagem do catálogo', () => {
    const appError = toAppError(new SessionNotOwnedError('Sessão não pertence ao usuário autenticado'));

    expect(appError.statusCode).toBe(403);
    expect(appError.code).toBe('SESSION_NOT_OWNED');
    expect(appError.message).toBe('Sessão não pertence ao usuário autenticado');
  });

  it('AppError passado adiante inalterado', () => {
    const original = AppError.conflict('USER_ALREADY_EXISTS', 'Usuário com este email já existe');
    const appError = toAppError(original);

    expect(appError).toBe(original);
  });

  it('erro genérico sem código → INTERNAL 500', () => {
    const appError = toAppError(new Error('falha imprevista'));

    expect(appError.statusCode).toBe(500);
    expect(appError.code).toBe('INTERNAL');
    expect(appError.message).toBe('Erro interno do servidor');
  });

  it('erro de infraestrutura com code conhecido → mapeado pelo catálogo (sem importar infra)', () => {
    const appError = toAppError(new RefreshTokenExpiredError('Refresh token expirado'));

    expect(appError.statusCode).toBe(401);
    expect(appError.code).toBe('REFRESH_TOKEN_EXPIRED');
    expect(appError.message).toBe('Refresh token expirado');
  });

  it('ZodError → VALIDATION_ERROR 422', () => {
    const result = z.email().safeParse('invalido');
    if (result.success) {
      throw new Error('Esperava-se falha de validação');
    }

    const appError = toAppError(result.error);

    expect(appError.statusCode).toBe(422);
    expect(appError.code).toBe('VALIDATION_ERROR');
  });
});
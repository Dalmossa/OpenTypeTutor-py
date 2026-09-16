export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(code: string, message: string = 'Não autorizado'): AppError {
    return new AppError(code, message, 401);
  }

  static forbidden(code: string, message: string = 'Acesso negado'): AppError {
    return new AppError(code, message, 403);
  }

  static notFound(code: string, message: string = 'Recurso não encontrado'): AppError {
    return new AppError(code, message, 404);
  }

  static conflict(code: string, message: string = 'Conflito'): AppError {
    return new AppError(code, message, 409);
  }

  static unprocessable(code: string, message: string = 'Dados inválidos'): AppError {
    return new AppError(code, message, 422);
  }

  static internal(code: string, message: string = 'Erro interno do servidor'): AppError {
    return new AppError(code, message, 500);
  }

  toJSON() {
    const result = {
      error: {
        code: this.code,
        message: this.message,
      } as Record<string, unknown>,
    };

    if (this.details !== undefined) {
      result.error.details = this.details;
    }

    return result;
  }
}
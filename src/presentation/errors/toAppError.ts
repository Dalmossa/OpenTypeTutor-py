import { z } from "zod";
import { DomainError } from "../../domain/errors/DomainError.js";
import { AppError } from "../../shared/errors/AppError.js";
import { findByErrorCode } from "../../shared/errors/ERROR_CODES.js";
import { createValidationAppError } from "../validation/zodErrorMap.js";

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof DomainError) {
    // O DomainError é a autoridade sobre a sua própria violação: já carrega
    // `code`, `statusCode` e uma mensagem pt-BR específica (ADR-011). Preferir o
    // catálogo aqui descartaria essa mensagem — `TOKEN_EXPIRED` de um token de
    // recuperação de senha sairia como "Token de acesso expirado". O catálogo é
    // o fallback para quem chega aqui sem mensagem própria.
    if (error.statusCode && error.message) {
      return new AppError(error.code, error.message, error.statusCode);
    }
    return (
      appErrorFromCode(error.code) ??
      AppError.internal("INTERNAL", "Erro interno do servidor")
    );
  }

  if (error instanceof z.ZodError) {
    return createValidationAppError(error);
  }

  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      const mapped = appErrorFromCode(code);
      if (mapped) {
        return mapped;
      }
    }
  }

  return AppError.internal("INTERNAL", "Erro interno do servidor");
}

function appErrorFromCode(code: string): AppError | undefined {
  const entry = findByErrorCode(code);
  if (!entry) {
    return undefined;
  }
  return new AppError(code, entry.message, entry.statusCode);
}

export interface ErrorCatalogEntry {
  statusCode: number;
  message: string;
}

export const ERROR_CODES: Record<string, ErrorCatalogEntry> = {
  NOT_FOUND: { statusCode: 404, message: "Rota não encontrada" },
  INTERNAL: { statusCode: 500, message: "Erro interno do servidor" },
  VALIDATION_ERROR: { statusCode: 422, message: "Dados inválidos" },
  UNAUTHORIZED: {
    statusCode: 401,
    message: "Token de acesso não fornecido ou inválido",
  },
  INVALID_TOKEN: { statusCode: 401, message: "Token de acesso inválido" },
  TOKEN_EXPIRED: { statusCode: 401, message: "Token de acesso expirado" },
  INVALID_REFRESH_TOKEN: {
    statusCode: 401,
    message: "Refresh token inválido ou revogado",
  },
  REFRESH_TOKEN_EXPIRED: { statusCode: 401, message: "Refresh token expirado" },
  INVALID_SESSION_TRANSITION: {
    statusCode: 400,
    message: "Transição de estado inválida para a sessão",
  },
  SESSION_NOT_OWNED: {
    statusCode: 403,
    message: "Sessão não pertence ao usuário autenticado",
  },
  PROFILE_NOT_OWNED: {
    statusCode: 403,
    message: "Perfil não pertence ao usuário autenticado",
  },
  USER_ALREADY_EXISTS: {
    statusCode: 409,
    message: "Usuário com este email já existe",
  },
  INVALID_CREDENTIALS: { statusCode: 401, message: "Credenciais inválidas" },
  LESSON_NOT_FOUND: { statusCode: 404, message: "Lição não encontrada" },
  USER_NOT_FOUND: { statusCode: 404, message: "Usuário não encontrado" },
  SESSION_NOT_FOUND: { statusCode: 404, message: "Sessão não encontrada" },
  SESSION_ALREADY_COMPLETED: {
    statusCode: 409,
    message: "Sessão já completada",
  },
  DISCOMFORT_SIGNALED: {
    statusCode: 422,
    message:
      "Desconforto sinalizado: interrompa o treino imediatamente, faça uma pausa, alongue e hidrate-se antes de retomar",
  },
  TOO_MANY_REQUESTS: {
    statusCode: 429,
    message: "Muitas tentativas de login. Tente novamente mais tarde",
  },
  BREAK_REQUIRED: {
    statusCode: 409,
    message:
      "Hora de descansar: faça uma pausa de pelo menos 3 minutos (alongue os braços, beba água e mexa as pernas) antes de iniciar a próxima lição",
  },
  MACRO_BREAK_REQUIRED: {
    statusCode: 409,
    message:
      "Hora de uma pausa mais longa: você concluiu muitas lições seguidas. Faça uma pausa de 3 horas antes de continuar",
  },
  // Recuperação de senha. Distintos de INVALID_TOKEN/TOKEN_EXPIRED, que são do
  // par de access/refresh tokens — aqui o token é de uso único e de redefinição.
  TOKEN_INVALID: {
    statusCode: 401,
    message: "Token de recuperação inválido",
  },
  TOKEN_ALREADY_USED: {
    statusCode: 409,
    message: "Token de recuperação já utilizado",
  },
  FORBIDDEN: { statusCode: 403, message: "Acesso negado" },
  CONFLICT: { statusCode: 409, message: "Conflito de estado" },
  HTTP_ERROR: { statusCode: 500, message: "Erro HTTP inesperado" },
  PASSWORD_TOO_SHORT: {
    statusCode: 422,
    message: "Senha deve ter pelo menos 8 caracteres",
  },
};

export function findByErrorCode(code: string): ErrorCatalogEntry | undefined {
  return ERROR_CODES[code];
}

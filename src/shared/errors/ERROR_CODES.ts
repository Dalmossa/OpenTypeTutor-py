export interface ErrorCatalogEntry {
  statusCode: number;
  message: string;
}

export const ERROR_CODES: Record<string, ErrorCatalogEntry> = {
  NOT_FOUND: { statusCode: 404, message: 'Rota não encontrada' },
  INTERNAL: { statusCode: 500, message: 'Erro interno do servidor' },
  VALIDATION_ERROR: { statusCode: 422, message: 'Dados inválidos' },
  UNAUTHORIZED: { statusCode: 401, message: 'Token de acesso não fornecido ou inválido' },
  INVALID_TOKEN: { statusCode: 401, message: 'Token de acesso inválido' },
  TOKEN_EXPIRED: { statusCode: 401, message: 'Token de acesso expirado' },
  INVALID_REFRESH_TOKEN: { statusCode: 401, message: 'Refresh token inválido ou revogado' },
  REFRESH_TOKEN_EXPIRED: { statusCode: 401, message: 'Refresh token expirado' },
  INVALID_SESSION_TRANSITION: {
    statusCode: 400,
    message: 'Transição de estado inválida para a sessão',
  },
  SESSION_NOT_OWNED: {
    statusCode: 403,
    message: 'Sessão não pertence ao usuário autenticado',
  },
  PROFILE_NOT_OWNED: {
    statusCode: 403,
    message: 'Perfil não pertence ao usuário autenticado',
  },
  INSUFFICIENT_SESSION_DATA: {
    statusCode: 422,
    message: 'Sessão sem dados suficientes para cálculo de métricas',
  },
  USER_ALREADY_EXISTS: { statusCode: 409, message: 'Usuário com este email já existe' },
  INVALID_CREDENTIALS: { statusCode: 401, message: 'Credenciais inválidas' },
  LESSON_NOT_FOUND: { statusCode: 404, message: 'Lição não encontrada' },
  USER_NOT_FOUND: { statusCode: 404, message: 'Usuário não encontrado' },
  SESSION_NOT_FOUND: { statusCode: 404, message: 'Sessão não encontrada' },
  SESSION_ALREADY_COMPLETED: { statusCode: 409, message: 'Sessão já completada' },
  DISCOMFORT_SIGNALED: {
    statusCode: 422,
    message:
      'Desconforto sinalizado: interrompa o treino imediatamente, faça uma pausa, alongue e hidrate-se antes de retomar',
  },
  TOO_MANY_REQUESTS: {
    statusCode: 429,
    message: 'Muitas tentativas de login. Tente novamente mais tarde',
  },
};

export function findByErrorCode(code: string): ErrorCatalogEntry | undefined {
  return ERROR_CODES[code];
}
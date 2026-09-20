// Tempo médio padrão de digitação por caractere (3x a latência de referência de 500ms
// adotada no app). Quando o usuário demora além disso na tecla aguardada, o teclado
// virtual pisca a tecla como dica (RN39). Tuning: aumentar = dica menos frequente.
export const KEY_HINT_TIMEOUT_MS = 1500;

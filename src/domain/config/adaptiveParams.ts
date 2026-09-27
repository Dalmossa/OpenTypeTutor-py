export const adaptiveParams = {
  WEAK_POOL_WEIGHT: 0.6,
  CONSOLIDATING_POOL_WEIGHT: 0.25,
  MASTERED_POOL_WEIGHT: 0.15,
  MASTERY_ACCURACY: 0.95,
  MASTERY_ATTEMPTS: 30,
  MASTERY_LATENCY_MS: 500,
  MASTERY_CONSECUTIVE_SESSIONS: 3,
  UNKNOWN_ATTEMPTS: 5,
  LATENCY_REFERENCE_MS: 500,
  WEAK_THRESHOLD: 0.7,
  CONSOLIDATING_THRESHOLD: 0.4,
  RECENCY_LAMBDA: 0.1,
  REINFORCEMENT_TARGET_CHARACTERS: 150,
  ACTIVE_DURATION_EPSILON_MS: 1000,
  LESSON_MASTERY_ACCURACY: 0.95,
  LESSON_REVIEW_ACCURACY: 0.6,
  LESSON_REVIEW_MIN_ATTEMPTS: 2,

  // RN33 - pacing de prática: bloco de 15 min de prática ativa → pausa mínima de 3 min (micro-pausa)
  PRACTICE_BLOCK_DURATION_MS: 900000,
  MIN_BREAK_DURATION_MS: 180000,

  // RN34 - macro-pausa: após N lições completadas → pausa longa (padrão 3 aulas → 3h)
  MACRO_LESSONS_THRESHOLD: 3,
  MACRO_BREAK_DURATION_MS: 10800000,
  MACRO_BREAK_ENABLED: true,

  // RN36 - MasteryProximityIndex: pesos da distância à maestria (Σ = 1, PRD §26)
  MPI_W_ACCURACY: 0.35,
  MPI_W_LATENCY: 0.25,
  MPI_W_STREAK: 0.25,
  MPI_W_ATTEMPTS: 0.15,

  // RN36 - faixas do índice para a UI (nunca cor sozinha — rótulo junto)
  MPI_BAND_FAR_THRESHOLD: 0.2,
  MPI_BAND_CLOSE_THRESHOLD: 0.5,
  MPI_BAND_VERGE_THRESHOLD: 0.8,

  // RN22 - janela de dados insuficiente: sessão com menos de 3s ativos ou 5 caracteres não gera WPM
  INSUFFICIENT_DATA_MIN_DURATION_MS: 3000,
  INSUFFICIENT_DATA_MIN_CHARS: 5,

  // RN35 - janelas de tendência do dashboard (períodos agregáveis, em dias)
  DASHBOARD_TREND_WINDOWS_DAYS: [7, 30, 90],
  DASHBOARD_HEATMAP_WINDOW_DAYS: 7,

  // RN10 (PRD §19) - regressão: tecla MASTERED entra em regressão após N sessões
  // consecutivas não mastery-approved. Valor distinto de MASTERY_CONSECUTIVE_SESSIONS
  // (promoção), e os dois contadores nunca sobem juntos (PRD §19).
  MASTERY_REGRESSION_SESSIONS: 3,

  // PRD §24.1 - piso de ruído de ponto flutuante: pool derivado com peso ~0 (LEARNING
  // subtraído de 1.0) não é reforço real, e resto ~0 é empate no desempate do
  // maior resto (RN19). Tolerâncias numéricas, não pesos pedagógicos.
  MIN_POOL_WEIGHT_EPSILON: 0.000001,
  POOL_REMAINDER_TIE_EPSILON: 0.0001,

  // Progressão de nível: quantas lições completadas sobem um nível.
  LESSONS_PER_LEVEL: 3,

  // PRD §16.5 - pesos do WeakKeyScore (Σ = 1). Moravam hardcoded em
  // `KeyPerformance`, único ponto do motor com peso fora daqui — o resto da
  // entidade já lia de `adaptiveParams` por alias. Relocado sem mudar valor:
  // a fórmula é parâmetro de produto, e parametrizar é o que permite calibrar
  // sem editar entidade de domínio.
  WEAK_KEY_SCORE_W_ERROR_RATE: 0.5,
  WEAK_KEY_SCORE_W_LATENCY: 0.3,
  WEAK_KEY_SCORE_W_RECENCY: 0.2,
} as const;

export type AdaptiveParams = typeof adaptiveParams;

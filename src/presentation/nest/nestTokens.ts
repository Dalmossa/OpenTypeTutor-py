export const TOKENS = {
  TOKEN_SERVICE: 'ITokenService',
  REGISTER_USER: 'RegisterUser',
  LOGIN: 'Login',
  REFRESH_TOKEN: 'RefreshToken',
  GET_USER: 'GetUser',
  UPDATE_USER_LAYOUT: 'UpdateUserLayout',
  LIST_LESSONS: 'ListLessons',
  GET_LESSON: 'GetLesson',
  START_SESSION: 'StartTypingSession',
  PAUSE_SESSION: 'PauseTypingSession',
  RESUME_SESSION: 'ResumeTypingSession',
  ABANDON_SESSION: 'AbandonTypingSession',
  SUBMIT_SESSION: 'SubmitTypingSession',
  GET_REINFORCEMENT_LESSON: 'GetReinforcementLesson',
  GET_USER_PROGRESS: 'GetUserProgress',
  GET_USER_KEY_PERFORMANCE: 'GetUserKeyPerformance',
  GET_NEXT_PEDAGOGICAL_LESSON: 'GetNextPedagogicalLesson',
  SUBMIT_PROGRESS_CARD: 'SubmitProgressCard',
  CHECK_ERGONOMIC_SAFETY: 'CheckErgonomicSafety',
} as const;

export type TokenMap = Record<(typeof TOKENS)[keyof typeof TOKENS], unknown>;
export const TOKENS = {
  TOKEN_SERVICE: "ITokenService",
  REGISTER_USER: "RegisterUser",
  LOGIN: "Login",
  REFRESH_TOKEN: "RefreshToken",
  GET_USER: "GetUser",
  UPDATE_USER_LAYOUT: "UpdateUserLayout",
  LIST_LESSONS: "ListLessons",
  GET_LESSON: "GetLesson",
  START_SESSION: "StartTypingSession",
  PAUSE_SESSION: "PauseTypingSession",
  RESUME_SESSION: "ResumeTypingSession",
  ABANDON_SESSION: "AbandonTypingSession",
  SUBMIT_SESSION: "SubmitTypingSession",
  GET_REINFORCEMENT_LESSON: "GetReinforcementLesson",
  GET_USER_PROGRESS: "GetUserProgress",
  RESET_PROGRESS: "ResetProgress",
  GET_USER_KEY_PERFORMANCE: "GetUserKeyPerformance",
  GET_NEXT_PEDAGOGICAL_LESSON: "GetNextPedagogicalLesson",
  SUBMIT_PROGRESS_CARD: "SubmitProgressCard",
  CHECK_ERGONOMIC_SAFETY: "CheckErgonomicSafety",
  GET_PRACTICE_STATUS: "GetPracticeStatus",
  GET_LESSON_PERFORMANCE: "GetLessonPerformance",
  GET_DASHBOARD_HABITS: "GetDashboardHabits",
  GET_DASHBOARD_MASTERY: "GetDashboardMastery",
  GET_DASHBOARD_PROXIMITY: "GetDashboardProximity",

  // Recuperação de senha e admin. Antes ausentes aqui: os use cases existiam e
  // eram testados, mas `npm run dev` sobe o Nest — sem token, o caso de uso não
  // era instanciado e a rota não existia no app que realmente sobe.
  REQUEST_PASSWORD_RESET: "RequestPasswordReset",
  CONFIRM_PASSWORD_RESET: "ConfirmPasswordReset",
  ADMIN_RESET_USER_PASSWORD: "AdminResetUserPassword",
  GET_ADMIN_SETTINGS: "GetAdminSettings",
  UPDATE_ADMIN_SETTINGS: "UpdateAdminSettings",
  GET_LESSON_PACING_STATUS: "GetLessonPacingStatus",
} as const;

export type TokenMap = Record<(typeof TOKENS)[keyof typeof TOKENS], unknown>;

// Fluxo "esqueci a senha" (forgot/reset password)
export interface RequestPasswordResetDTO {
  email: string;
}

export interface RequestPasswordResetResponseDTO {
  message: string;
  /**
   * Só em desenvolvimento (`NODE_ENV !== 'production'`). O provedor de e-mail
   * está fora de escopo (ADR-013), então é o que dá fluxo ao teste local; em
   * produção o token sairia por e-mail e nunca pela resposta.
   */
  devToken?: string;
}

export interface ConfirmPasswordResetDTO {
  token: string;
  newPassword: string;
}

export interface ConfirmPasswordResetResponseDTO {
  message: string;
}

// Admin reset de senha de outro usuário
export interface AdminResetUserPasswordDTO {
  userId: string;
  newPassword: string;
}

export interface AdminResetUserPasswordResponseDTO {
  message: string;
}

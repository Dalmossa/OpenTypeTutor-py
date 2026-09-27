import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    email: z.email().trim(),
    password: z.string().min(8),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(1, "Senha é obrigatória"),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token é obrigatório"),
  })
  .strict();

export const requestPasswordResetSchema = z
  .object({
    email: z.email().trim(),
  })
  .strict();

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    newPassword: z
      .string()
      .min(8, "Nova senha deve ter pelo menos 8 caracteres"),
  })
  .strict();

export const adminResetUserPasswordSchema = z
  .object({
    userId: z.uuid("ID do usuário inválido"),
    newPassword: z
      .string()
      .min(8, "Nova senha deve ter pelo menos 8 caracteres"),
  })
  .strict();

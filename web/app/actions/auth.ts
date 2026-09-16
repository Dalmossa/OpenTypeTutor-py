'use server';

import { redirect } from 'next/navigation';

import { createControllers, ApiError } from '@/controllers';
import { clearTokens, getStoredTokens, storeTokens } from '@/lib/session';
import type { LoginDTO, RegisterUserDTO } from '@/models/auth';

export type AuthActionResult = {
  ok: true;
} | {
  ok: false;
  error: { code: string; message: string };
};

function toError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  return { code: 'UNKNOWN_ERROR', message: 'Erro inesperado. Tente novamente.' };
}

export async function loginAction(input: LoginDTO): Promise<AuthActionResult> {
  try {
    const tokens = await createControllers().auth.login(input);
    await storeTokens(tokens.accessToken, tokens.refreshToken);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function registerAction(input: RegisterUserDTO): Promise<AuthActionResult> {
  const auth = createControllers().auth;
  try {
    await auth.register(input);
    const tokens = await auth.login({ email: input.email, password: input.password });
    await storeTokens(tokens.accessToken, tokens.refreshToken);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export interface RefreshResult {
  accessToken: string | null;
}

export async function refreshAction(): Promise<RefreshResult> {
  const { refresh } = await getStoredTokens();
  if (refresh === null) {
    return { accessToken: null };
  }

  try {
    const tokens = await createControllers().auth.refresh({ refreshToken: refresh });
    await storeTokens(tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  } catch {
    await clearTokens();
    return { accessToken: null };
  }
}

export async function logoutAction(): Promise<void> {
  await clearTokens();
  redirect('/login');
}
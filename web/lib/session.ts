import { cookies } from 'next/headers';

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '@/config/authParams';

export interface StoredTokens {
  access: string | null;
  refresh: string | null;
}

export async function getStoredTokens(): Promise<StoredTokens> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refresh: store.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export async function storeTokens(access: string, refresh: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: '/',
  });
  store.set(REFRESH_TOKEN_COOKIE, refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
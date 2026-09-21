import type { ReactNode } from 'react';

import { LandingPage } from '@/components/landing/landing-page';
import { getStoredTokens } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<ReactNode> {
  const tokens = await getStoredTokens();
  return <LandingPage authenticated={tokens.access !== null} />;
}
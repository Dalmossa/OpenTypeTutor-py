'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { createControllers } from '@/controllers';
import { refreshAction } from '@/app/actions/auth';
import type { GetUserResponseDTO } from '@/models/auth';

interface AuthContextValue {
  user: GetUserResponseDTO | null;
  accessToken: string | null;
  loading: boolean;
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const router = useRouter();
  const [user, setUser] = useState<GetUserResponseDTO | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<string | null> => {
    const result = await refreshAction();
    if (result.accessToken !== null) {
      setAccessToken(result.accessToken);
    }
    return result.accessToken;
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async (): Promise<void> => {
      const token = await refresh();
      if (cancelled) {
        return;
      }
      if (token === null) {
        setLoading(false);
        void router.replace('/login');
        return;
      }

      try {
        const me = await createControllers().user.getSession(token);
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        // sessão inválida mesmo após refresh — próximo acesso redireciona
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
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
  updateLayout: (layout: string) => Promise<void>;
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

  // UI-UX-SRD §6.7 - PATCH /users/me (layout) e reflete a resposta no usuário do contexto
  const updateLayout = async (layout: string): Promise<void> => {
    if (accessToken === null || user === null) {
      throw new Error('Você não está autenticado.');
    }
    const updated = await createControllers().user.updateLayout(layout, accessToken);
    setUser((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            activeLayout: updated.activeLayout,
            currentLevel: updated.currentLevel,
          },
    );
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
    <AuthContext.Provider value={{ user, accessToken, loading, refresh, updateLayout }}>
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
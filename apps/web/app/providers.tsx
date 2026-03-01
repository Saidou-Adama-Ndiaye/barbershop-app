// .\.\apps\web\app\providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { setAccessToken } from '@/lib/api';
import axios from 'axios';

// ─── Composant qui restaure la session au démarrage ──────
function SessionRestorer() {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Tenter un refresh au démarrage (cookie httpOnly envoyé automatiquement)
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        if (data.accessToken) {
          setAccessToken(data.accessToken);

          // Récupérer le profil avec le nouveau token
          const { default: api } = await import('@/lib/api');
          const profileRes = await api.get('/auth/me');
          setAuth(profileRes.data, data.accessToken);
        }
      } catch {
        // Pas de session active → état déconnecté normal
        clearAuth();
      }
    };

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Providers principal ─────────────────────────────────
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionRestorer />
      {children}
    </QueryClientProvider>
  );
}
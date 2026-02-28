import { create } from 'zustand';
import { setAccessToken, clearAccessToken } from '../api';

// ─── Types ────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'coiffeur_professionnel' | 'client';
  isVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // true au départ : on vérifie la session

  setAuth: (user: AuthUser, token: string) => {
    setAccessToken(token); // synchronise avec lib/api.ts
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    clearAccessToken(); // nettoie lib/api.ts
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
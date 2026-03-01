// .\.\apps\web\lib\api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Instance principale ──────────────────────────────────
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // envoie le cookie httpOnly refresh_token
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Intercepteur requête : injecter l'access token ──────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // On lit le token depuis le store en mémoire
  // Import dynamique pour éviter les dépendances circulaires
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Intercepteur réponse : refresh auto si 401 ──────────
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si 401 et pas déjà en retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Mettre en file d'attente les requêtes pendant le refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Appel refresh — le cookie httpOnly est envoyé automatiquement
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken: string = data.accessToken;

        // Mettre à jour le store
        setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh échoué → déconnexion
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Gestion token en mémoire (pas localStorage) ─────────
// Stockage en mémoire : sécurisé contre XSS
let _accessToken: string | null = null;

export const getAccessToken = (): string | null => _accessToken;
export const setAccessToken = (token: string): void => { _accessToken = token; };
export const clearAccessToken = (): void => { _accessToken = null; };

export default api;
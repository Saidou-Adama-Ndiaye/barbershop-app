import api from './api';
import { AuthUser } from './store/auth.store';

// ─── Types ────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

// ─── Login ────────────────────────────────────────────────
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
}

// ─── Register ─────────────────────────────────────────────
export async function register(registerData: RegisterData): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', registerData);
  return data;
}

// ─── Logout ───────────────────────────────────────────────
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // On ignore les erreurs réseau au logout
  }
}

// ─── Get Profile (utilisateur connecté) ──────────────────
export async function getProfile(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

// ─── Refresh token ────────────────────────────────────────
export async function refreshToken(): Promise<{ accessToken: string }> {
  const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
  return data;
}
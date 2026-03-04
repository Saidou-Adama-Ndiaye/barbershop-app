// apps\web\lib\profile.ts
import api from './api';

// ─── Types ────────────────────────────────────────────────
export interface UpdateProfileData {
  firstName?: string;
  lastName?:  string;
  phone?:     string;
}

export interface UserAddress {
  id:        string;
  label:     string;
  street:    string;
  city:      string;
  country:   string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressData {
  label:      string;
  street:     string;
  city:       string;
  country?:   string;
  isDefault?: boolean;
}

// ─── Profil ───────────────────────────────────────────────
export async function updateProfile(data: UpdateProfileData) {
  const { data: res } = await api.patch('/users/me', data);
  return res;
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await api.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword:     string;
}) {
  const { data: res } = await api.patch('/users/me/password', data);
  return res;
}

// ─── Adresses ─────────────────────────────────────────────
export async function getAddresses(): Promise<UserAddress[]> {
  const { data } = await api.get('/users/me/addresses');
  return data;
}

export async function createAddress(data: CreateAddressData): Promise<UserAddress> {
  const { data: res } = await api.post('/users/me/addresses', data);
  return res;
}

export async function updateAddress(
  id: string,
  data: Partial<CreateAddressData>,
): Promise<UserAddress> {
  const { data: res } = await api.patch(`/users/me/addresses/${id}`, data);
  return res;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/users/me/addresses/${id}`);
}

// ─── Auth email ───────────────────────────────────────────
export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post(`/auth/reset-password/${token}`, { password });
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await api.get(`/auth/verify-email/${token}`);
  return data;
}

export async function resendVerification() {
  const { data } = await api.post('/auth/resend-verification');
  return data;
}
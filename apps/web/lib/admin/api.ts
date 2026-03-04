// apps\web\lib\admin\api.ts
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────

export interface AdminCategory {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  imageUrl:    string | null;
  parentId:    string | null;
  sortOrder:   number;
  isActive:    boolean;
  createdAt:   string;
  children?:   AdminCategory[];
  parent?:     AdminCategory | null;
}

export interface AdminProduct {
  id:          string;
  name:        string;
  description: string | null;
  unitPrice:   number;
  stockQty:    number;
  sku:         string | null;
  imageUrls:   string[];
  categoryId:  string | null;
  isActive:    boolean;
  createdAt:   string;
  category?:   AdminCategory | null;
}

export interface AdminPack {
  id:             string;
  name:           string;
  slug:           string;
  description:    string | null;
  basePrice:      number;
  discountPct:    number;
  imageUrls:      string[];
  isCustomizable: boolean;
  isActive:       boolean;
  categoryId:     string | null;
  createdAt:      string;
  category?:      AdminCategory | null;
  packProducts?:  AdminPackProduct[];
}

export interface AdminPackProduct {
  id:         string;
  packId:     string;
  productId:  string;
  quantity:   number;
  isOptional: boolean;
  sortOrder:  number;
  product:    AdminProduct;
}

export interface AdminService {
  id:          string;
  name:        string;
  description: string | null;
  price:       number;
  durationMin: number;
  depositPct:  number;
  inclusions:  string[];
  isActive:    boolean;
  createdAt:   string;
}

export interface AdminFormation {
  id:            string;
  title:         string;
  slug:          string;
  description:   string | null;
  price:         number;
  level:         string;
  language:      string;
  tags:          string[];
  isPublished:   boolean;
  totalEnrolled: number;
  thumbnailUrl:  string | null;
  createdAt:     string;
  instructor?:   { id: string; firstName: string; lastName: string };
}

export interface AdminVideo {
  id:            string;
  formationId:   string;
  title:         string;
  description:   string | null;
  durationSec:   number;
  sortOrder:     number;
  isFreePreview: boolean;
  createdAt:     string;
}

export interface AdminCoiffeur {
  id:           string;
  firstName:    string;
  lastName:     string;
  email:        string;
  isActive:     boolean;
  totalRdv:     number;
  completedRdv: number;
  noShowRdv:    number;
  revenue:      number;
}

export interface AuditLog {
  id:         string;
  userId:     string | null;
  action:     string;
  entityType: string | null;
  entityId:   string | null;
  metadata:   Record<string, unknown> | null;
  createdAt:  string;
  user?:      { id: string; firstName: string; lastName: string; email: string } | null;
}

// ─── CATEGORIES ───────────────────────────────────────────

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await api.get('/admin/categories');
  return data;
}

export async function createAdminCategory(formData: FormData): Promise<AdminCategory> {
  const { data } = await api.post('/admin/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateAdminCategory(id: string, formData: FormData): Promise<AdminCategory> {
  const { data } = await api.patch(`/admin/categories/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

// ─── PRODUCTS ─────────────────────────────────────────────

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { data } = await api.get('/admin/products');
  return data;
}

export async function createAdminProduct(formData: FormData): Promise<AdminProduct> {
  const { data } = await api.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateAdminProduct(id: string, formData: FormData): Promise<AdminProduct> {
  const { data } = await api.patch(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

// ─── PACKS ────────────────────────────────────────────────

export async function getAdminPacks(): Promise<AdminPack[]> {
  const { data } = await api.get('/admin/packs');
  return data;
}

export async function createAdminPack(body: Partial<AdminPack>): Promise<AdminPack> {
  const { data } = await api.post('/admin/packs', body);
  return data;
}

export async function updateAdminPack(id: string, body: Partial<AdminPack>): Promise<AdminPack> {
  const { data } = await api.patch(`/admin/packs/${id}`, body);
  return data;
}

export async function deleteAdminPack(id: string): Promise<void> {
  await api.delete(`/admin/packs/${id}`);
}

export async function addProductToPack(
  packId: string,
  body: { productId: string; quantity?: number; isOptional?: boolean; sortOrder?: number },
): Promise<AdminPackProduct> {
  const { data } = await api.post(`/admin/packs/${packId}/products`, body);
  return data;
}

export async function removeProductFromPack(packId: string, productId: string): Promise<void> {
  await api.delete(`/admin/packs/${packId}/products/${productId}`);
}

// ─── SERVICES ─────────────────────────────────────────────

export async function getAdminServices(): Promise<AdminService[]> {
  const { data } = await api.get('/admin/services');
  return data;
}

export async function createAdminService(body: Partial<AdminService>): Promise<AdminService> {
  const { data } = await api.post('/admin/services', body);
  return data;
}

export async function updateAdminService(id: string, body: Partial<AdminService>): Promise<AdminService> {
  const { data } = await api.patch(`/admin/services/${id}`, body);
  return data;
}

export async function deleteAdminService(id: string): Promise<void> {
  await api.delete(`/admin/services/${id}`);
}

// ─── FORMATIONS ───────────────────────────────────────────

export async function getAdminFormations(): Promise<AdminFormation[]> {
  const { data } = await api.get('/admin/formations');
  return data;
}

export async function createAdminFormation(formData: FormData): Promise<AdminFormation> {
  const { data } = await api.post('/admin/formations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateAdminFormation(id: string, formData: FormData): Promise<AdminFormation> {
  const { data } = await api.patch(`/admin/formations/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAdminFormation(id: string): Promise<void> {
  await api.delete(`/admin/formations/${id}`);
}

export async function uploadVideo(
  formationId: string,
  formData:    FormData,
  onProgress?: (pct: number) => void,
): Promise<{ videoId: string; durationSec: number }> {
  const { data } = await api.post(`/admin/formations/${formationId}/videos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data;
}

export async function updateAdminVideo(
  formationId: string,
  videoId:     string,
  body:        Partial<AdminVideo>,
): Promise<AdminVideo> {
  const { data } = await api.patch(`/admin/formations/${formationId}/videos/${videoId}`, body);
  return data;
}

export async function deleteAdminVideo(formationId: string, videoId: string): Promise<void> {
  await api.delete(`/admin/formations/${formationId}/videos/${videoId}`);
}

// ─── COIFFEURS ────────────────────────────────────────────

export async function getAdminCoiffeurs(): Promise<{ coiffeurs: AdminCoiffeur[] }> {
  const { data } = await api.get('/admin/coiffeurs');
  return data;
}

export async function createAdminCoiffeur(body: {
  email:     string;
  firstName: string;
  lastName:  string;
  phone?:    string;
  password:  string;
}): Promise<AdminCoiffeur> {
  const { data } = await api.post('/admin/coiffeurs', body);
  return data;
}

// ─── AUDIT LOGS ───────────────────────────────────────────

export async function getAuditLogs(params: {
  userId?:     string;
  action?:     string;
  entityType?: string;
  from?:       string;
  to?:         string;
  page?:       number;
  limit?:      number;
}): Promise<{ data: AuditLog[]; total: number; page: number }> {
  const { data } = await api.get('/admin/audit-logs', { params });
  return data;
}

// ─── Helper : URL signée MinIO ────────────────────────────
export async function getSignedImageUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const { data } = await api.get('/users/me/avatar-url', { params: { key } });
    return data.url ?? null;
  } catch {
    return null;
  }
}

// ─── COUPONS ─────────────────────────────────────────────

export interface AdminCoupon {
  id:           string;
  code:         string;
  discountType: 'percent' | 'fixed';
  value:        number;
  minOrder:     number;
  maxUses:      number | null;
  usedCount:    number;
  expiresAt:    string | null;
  isActive:     boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface CreateCouponPayload {
  code:         string;
  discountType: 'percent' | 'fixed';
  value:        number;
  minOrder?:    number;
  maxUses?:     number;
  expiresAt?:   string;
  isActive?:    boolean;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export const getAdminCoupons = async (): Promise<AdminCoupon[]> => {
  const { data } = await api.get<AdminCoupon[]>('/admin/coupons');
  return data;
};

export const createAdminCoupon = async (
  payload: CreateCouponPayload,
): Promise<AdminCoupon> => {
  const { data } = await api.post<AdminCoupon>('/admin/coupons', payload);
  return data;
};

export const updateAdminCoupon = async (
  id: string,
  payload: UpdateCouponPayload,
): Promise<AdminCoupon> => {
  const { data } = await api.patch<AdminCoupon>(`/admin/coupons/${id}`, payload);
  return data;
};

export const deleteAdminCoupon = async (id: string): Promise<void> => {
  await api.delete(`/admin/coupons/${id}`);
};
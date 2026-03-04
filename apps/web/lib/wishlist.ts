// apps/web/lib/wishlist.ts
import api from './api';

// ─── Types ───────────────────────────────────────────────
export interface WishlistPack {
  id: string;
  pack: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    basePrice: number;
    discountPct: number;
    finalPrice: number;
    imageUrls: string[];
    isCustomizable: boolean;
    avgRating: number;
    reviewCount: number;
    packProducts: {
      id: string;
      product: { name: string };
      quantity: number;
      isOptional: boolean;
    }[];
  };
  createdAt: string;
}

// ─── API calls ───────────────────────────────────────────
export const getWishlist = async (): Promise<WishlistPack[]> => {
  const { data } = await api.get<WishlistPack[]>('/users/me/wishlist');
  return data;
};

export const getWishlistIds = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/users/me/wishlist/ids');
  return data;
};

export const toggleWishlist = async (
  packId: string,
): Promise<{ inWishlist: boolean }> => {
  const { data } = await api.post<{ inWishlist: boolean }>(
    '/users/me/wishlist/toggle',
    { packId },
  );
  return data;
};
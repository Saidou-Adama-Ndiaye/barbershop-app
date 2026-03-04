// apps/web/lib/reviews.ts
import api from './api';

// ─── Types ───────────────────────────────────────────────
export interface Review {
  id: string;
  userId: string;
  packId: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
}

// ─── Récupérer les avis d'un pack ────────────────────────
export const getPackReviews = async (slug: string): Promise<ReviewsResponse> => {
  const { data } = await api.get<ReviewsResponse>(`/packs/${slug}/reviews`);
  return data;
};

// ─── Soumettre un avis ───────────────────────────────────
export const submitReview = async (
  slug: string,
  payload: { rating: number; comment?: string },
): Promise<Review> => {
  const { data } = await api.post<Review>(`/packs/${slug}/reviews`, payload);
  return data;
};
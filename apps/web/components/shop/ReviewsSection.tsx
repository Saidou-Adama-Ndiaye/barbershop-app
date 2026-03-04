// apps/web/components/shop/ReviewsSection.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { getPackReviews, submitReview, Review } from '@/lib/reviews';
import StarRating from './StarRating';

// ─── Helpers ─────────────────────────────────────────────
const getInitials = (user?: Review['user']): string => {
  if (!user) return '?';
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() ?? '?';
};

const getDisplayName = (user?: Review['user']): string => {
  if (!user) return 'Utilisateur';
  if (user.firstName) return user.firstName;
  return user.email?.split('@')[0] ?? 'Utilisateur';
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('fr-SN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// ─── Composant carte avis ─────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar initiales */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {getInitials(review.user)}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {getDisplayName(review.user)}
            </p>
            <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.rating} readonly size="sm" />
      </div>

      {review.comment && (
        <p className="text-gray-600 text-sm leading-relaxed pl-[52px]">
          {review.comment}
        </p>
      )}
    </div>
  );
}

// ─── Formulaire soumission avis ───────────────────────────
function ReviewForm({
  slug,
  onSuccess,
}: {
  slug: string;
  onSuccess: () => void;
}) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const queryClient           = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => submitReview(slug, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['pack', slug] });
      setRating(0);
      setComment('');
      setError(null);
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Erreur lors de la soumission');
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
      <h4 className="font-semibold text-gray-900">Votre avis</h4>

      {/* Sélection note */}
      <div className="space-y-1">
        <label className="text-sm text-gray-600">Note *</label>
        <div className="flex items-center gap-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <span className="text-sm text-gray-500">
              {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'][rating]}
            </span>
          )}
        </div>
      </div>

      {/* Commentaire */}
      <div className="space-y-1">
        <label className="text-sm text-gray-600">Commentaire (optionnel)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience avec ce pack..."
          rows={3}
          maxLength={500}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
        <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Info modération */}
      <p className="text-xs text-gray-400">
        ℹ️ Votre avis sera visible après validation par notre équipe.
      </p>

      {/* Bouton */}
      <button
        onClick={handleSubmit}
        disabled={mutation.isPending || rating === 0}
        className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {mutation.isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Envoi en cours...
          </>
        ) : (
          '✉️ Soumettre mon avis'
        )}
      </button>
    </div>
  );
}

// ─── Composant principal ReviewsSection ──────────────────
interface ReviewsSectionProps {
  slug: string;
  avgRating: number;
  reviewCount: number;
}

export default function ReviewsSection({
  slug,
  avgRating,
  reviewCount,
}: ReviewsSectionProps) {
  const { isAuthenticated } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', slug],
    queryFn:  () => getPackReviews(slug),
  });

  const reviews = data?.reviews ?? [];

  return (
    <section className="space-y-6">

      {/* En-tête avec résumé */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Avis clients</h2>
        {reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={avgRating} readonly size="md" />
            <span className="font-bold text-gray-900">
              {Number(avgRating).toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">
              ({reviewCount} avis)
            </span>
          </div>
        )}
      </div>

      {/* Formulaire si connecté */}
      {isAuthenticated && !submitted && (
        <ReviewForm slug={slug} onSuccess={() => setSubmitted(true)} />
      )}

      {/* Confirmation soumission */}
      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-green-800">Avis soumis avec succès !</p>
            <p className="text-sm text-green-600">
              Il sera visible après validation par notre équipe.
            </p>
          </div>
        </div>
      )}

      {/* Invitation à se connecter */}
      {!isAuthenticated && (
        <div className="bg-gray-50 rounded-2xl p-5 text-center space-y-2">
          <p className="text-gray-600 text-sm">
            Connectez-vous pour laisser un avis
          </p>
          
            <a href="/login"
            className="inline-block bg-gray-900 text-white text-sm px-5 py-2 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Se connecter
          </a>
        </div>
      )}

      {/* Liste des avis */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <span className="text-4xl block mb-2">💬</span>
          <p className="text-sm">Aucun avis pour ce pack pour l&apos;instant.</p>
          <p className="text-sm">Soyez le premier à donner votre avis !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}
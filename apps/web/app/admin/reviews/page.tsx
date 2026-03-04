// apps/web/app/admin/reviews/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Review {
  id:        string;
  rating:    number;
  comment:   string | null;
  status:    ReviewStatus;
  createdAt: string;
  user?: {
    id:        string;
    firstName: string;
    lastName:  string;
    email:     string;
  };
  pack?: {
    id:   string;
    name: string;
    slug: string;
  };
}

// ─── Constantes ───────────────────────────────────────────
const STATUS_CONFIG: Record<ReviewStatus, {
  label: string; color: string; bg: string; icon: string;
}> = {
  pending:  { label: 'En attente', color: 'text-amber-700',  bg: 'bg-amber-100',  icon: '🕐' },
  approved: { label: 'Approuvé',   color: 'text-green-700',  bg: 'bg-green-100',  icon: '✅' },
  rejected: { label: 'Rejeté',     color: 'text-red-700',    bg: 'bg-red-100',    icon: '❌' },
};

const fmt = (d: string) =>
  new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(d));

// ─── Composant étoiles readonly ───────────────────────────
function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= value ? 'text-amber-400' : 'text-gray-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Modal détail avis ────────────────────────────────────
function ReviewModal({
  review,
  onClose,
  onModerate,
}: {
  review:     Review;
  onClose:    () => void;
  onModerate: (id: string, status: 'approved' | 'rejected') => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handle = async (status: 'approved' | 'rejected') => {
    setIsUpdating(true);
    try {
      await onModerate(review.id, status);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Détail de l&apos;avis</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* Pack */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <span className="text-2xl">✂️</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Pack</p>
                <p className="font-semibold text-gray-900">
                  {review.pack?.name ?? 'Pack inconnu'}
                </p>
              </div>
            </div>

            {/* Utilisateur + note */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {review.user?.firstName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {review.user
                      ? `${review.user.firstName} ${review.user.lastName}`
                      : 'Utilisateur inconnu'
                    }
                  </p>
                  <p className="text-xs text-gray-400">{review.user?.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(review.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Stars value={review.rating} />
                <span className="text-sm font-bold text-gray-900">
                  {review.rating}/5
                </span>
              </div>
            </div>

            {/* Commentaire */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Commentaire
              </p>
              {review.comment ? (
                <p className="text-gray-700 text-sm leading-relaxed">
                  &ldquo;{review.comment}&rdquo;
                </p>
              ) : (
                <p className="text-gray-400 text-sm italic">Aucun commentaire</p>
              )}
            </div>

            {/* Statut actuel */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Statut actuel :</span>
              <span className={`
                inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                ${STATUS_CONFIG[review.status].bg}
                ${STATUS_CONFIG[review.status].color}
              `}>
                {STATUS_CONFIG[review.status].icon}
                {STATUS_CONFIG[review.status].label}
              </span>
            </div>

            {/* Actions modération */}
            {review.status === 'pending' && (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => handle('rejected')}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '...' : '❌ Rejeter'}
                </button>
                <button
                  onClick={() => handle('approved')}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '...' : '✅ Approuver'}
                </button>
              </div>
            )}

            {/* Déjà modéré — permettre de changer */}
            {review.status !== 'pending' && (
              <div className="flex gap-3 pt-1">
                {review.status === 'approved' && (
                  <button
                    onClick={() => handle('rejected')}
                    disabled={isUpdating}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? '...' : '↩️ Passer en rejeté'}
                  </button>
                )}
                {review.status === 'rejected' && (
                  <button
                    onClick={() => handle('approved')}
                    disabled={isUpdating}
                    className="flex-1 py-2.5 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? '...' : '↩️ Passer en approuvé'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminReviewsPage() {
  const queryClient                       = useQueryClient();
  const [filterStatus, setFilterStatus]   = useState<ReviewStatus | 'all'>('pending');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  // ─── Fetch avis ──────────────────────────────────────
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', filterStatus],
    queryFn:  async () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const { data } = await api.get<Review[]>(`/admin/reviews${params}`);
      return data;
    },
  });

  // ─── Mutation modération ─────────────────────────────
  const moderateMutation = useMutation({
    mutationFn: async ({
      id, status,
    }: {
      id: string; status: 'approved' | 'rejected';
    }) => {
      const { data } = await api.patch<Review>(
        `/reviews/${id}/moderate`,
        { status },
      );
      return data;
    },
    onSuccess: (updated) => {
      // Mise à jour optimiste du cache
      queryClient.setQueryData<Review[]>(
        ['admin-reviews', filterStatus],
        (old) => old?.map((r) => (r.id === updated.id ? updated : r)) ?? [],
      );
      // Invalider les autres filtres
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const handleModerate = async (
    id: string,
    status: 'approved' | 'rejected',
  ) => {
    await moderateMutation.mutateAsync({ id, status });
  };

  // ─── Compteurs ───────────────────────────────────────
  const counts = {
    all:      reviews.length,
    pending:  reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  // Recalcul depuis toutes les reviews (pas juste le filtre actif)
  const { data: allReviews = [] } = useQuery({
    queryKey: ['admin-reviews', 'all'],
    queryFn:  async () => {
      const { data } = await api.get<Review[]>('/admin/reviews');
      return data;
    },
  });

  const globalCounts = allReviews.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    acc.all       = (acc.all       ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modération des avis</h1>
          <p className="text-gray-400 mt-1">
            {globalCounts.pending ?? 0} avis en attente de modération
          </p>
        </div>

        {/* Badge alerte si pending */}
        {(globalCounts.pending ?? 0) > 0 && (
          <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-2">
            <span className="text-amber-400 text-lg">⚠️</span>
            <span className="text-amber-300 text-sm font-medium">
              {globalCounts.pending} avis à modérer
            </span>
          </div>
        )}
      </div>

      {/* ── Filtres statut ─────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all',      label: 'Tous'        },
          { key: 'pending',  label: '🕐 En attente' },
          { key: 'approved', label: '✅ Approuvés'  },
          { key: 'rejected', label: '❌ Rejetés'    },
        ] as { key: ReviewStatus | 'all'; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterStatus === key
                ? 'bg-white text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              filterStatus === key ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-400'
            }`}>
              {globalCounts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Liste avis ─────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">💬</p>
          <p>Aucun avis {filterStatus !== 'all' ? `"${STATUS_CONFIG[filterStatus as ReviewStatus]?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => {
            const cfg = STATUS_CONFIG[review.status];
            return (
              <button
                key={review.id}
                onClick={() => setSelectedReview(review)}
                className="w-full bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-4 text-left transition-all hover:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Gauche : avatar + infos */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {review.user?.firstName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white text-sm">
                          {review.user
                            ? `${review.user.firstName} ${review.user.lastName}`
                            : 'Utilisateur inconnu'
                          }
                        </p>
                        <Stars value={review.rating} />
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Sur{' '}
                        <span className="text-gray-300 font-medium">
                          {review.pack?.name ?? 'Pack inconnu'}
                        </span>
                        {' · '}{fmt(review.createdAt)}
                      </p>
                      {review.comment && (
                        <p className="text-gray-400 text-xs mt-1.5 line-clamp-1">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Droite : statut */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`
                      inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                      ${cfg.bg} ${cfg.color}
                    `}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-gray-600 text-xs">›</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onModerate={handleModerate}
        />
      )}
    </div>
  );
}
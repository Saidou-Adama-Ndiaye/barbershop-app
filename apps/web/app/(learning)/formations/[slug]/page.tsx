// .\.\apps\web\app\(learning)\formations\[slug]\page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth.store';

// ─── Types ────────────────────────────────────────────────
interface Video {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  sortOrder: number;
  isFreePreview: boolean;
}

interface FormationDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  level: string;
  language: string;
  durationMin: number;
  totalEnrolled: number;
  tags: string[];
  thumbnailUrl: string;
  instructor: { firstName: string; lastName: string };
  videos: Video[];
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(amount);

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m} min`;
};

const levelLabels: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
};

// ─── Composant ────────────────────────────────────────────
export default function FormationDetailPage() {
  const { slug }  = useParams<{ slug: string }>();
  const router    = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: formation, isLoading, isError } = useQuery({
    queryKey: ['formation', slug],
    queryFn: async () => {
      const { data } = await api.get<FormationDetail>(`/formations/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  // Mutation enrollment
  const enrollMutation = useMutation({
    mutationFn: async (formationId: string) => {
      const { data } = await api.post(`/formations/${formationId}/enroll`);
      return data;
    },
    onSuccess: (data) => {
      // Rediriger vers la page de paiement Wave
      window.open(data.payment.redirectUrl, '_blank');
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message ?? 'Erreur lors de l\'inscription');
    },
  });

  const handleEnroll = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/formations/${slug}`);
      return;
    }
    if (formation) enrollMutation.mutate(formation.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !formation) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">❌</span>
        <p className="text-lg font-medium text-gray-700">Formation introuvable</p>
        <Link href="/formations" className="text-sm text-gray-500 underline mt-2 block">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const totalDurationSec = formation.videos.reduce((s, v) => s + v.durationSec, 0);
  const freeVideos = formation.videos.filter((v) => v.isFreePreview);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/formations" className="hover:text-gray-900">Formations</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{formation.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Colonne gauche : infos */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {levelLabels[formation.level] ?? formation.level}
              </span>
              <span className="text-xs text-gray-400">{formation.language.toUpperCase()}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{formation.title}</h1>
            <p className="text-gray-500 mt-2">
              Par {formation.instructor?.firstName} {formation.instructor?.lastName}
            </p>
          </div>

          {/* Description */}
          {formation.description && (
            <p className="text-gray-700 leading-relaxed">{formation.description}</p>
          )}

          {/* Tags */}
          {formation.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formation.tags.map((tag, i) => (
                <span key={i} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '🎬', label: `${formation.videos.length} leçons` },
              { icon: '⏱️', label: formatDuration(totalDurationSec) },
              { icon: '👥', label: `${formation.totalEnrolled} inscrits` },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <span className="text-2xl block mb-1">{stat.icon}</span>
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Liste des leçons */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Programme du cours</h2>
            <div className="space-y-2">
              {formation.videos.map((video, i) => (
                <div
                  key={video.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    video.isFreePreview
                      ? 'border-green-200 bg-green-50 cursor-pointer hover:bg-green-100'
                      : 'border-gray-100 bg-white'
                  }`}
                  onClick={() => {
                    if (video.isFreePreview) {
                      router.push(`/formations/${slug}/lecteur?videoId=${video.id}&formationId=${formation.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{video.title}</p>
                      {video.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{video.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatDuration(video.durationSec)}
                    </span>
                    {video.isFreePreview ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Gratuit
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">🔒</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite : CTA achat */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 sticky top-24">

            {/* Thumbnail */}
            <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-600 rounded-xl flex items-center justify-center">
              <span className="text-5xl">🎬</span>
            </div>

            {/* Prix */}
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(formation.price)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Accès illimité à vie</p>
            </div>

            {/* Ce que vous obtenez */}
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                `${formation.videos.length} leçons vidéo HD`,
                `${formatDuration(totalDurationSec)} de contenu`,
                'Accès mobile & desktop',
                'Certificat de réussite',
                freeVideos.length > 0 ? `${freeVideos.length} leçon${freeVideos.length > 1 ? 's' : ''} gratuite${freeVideos.length > 1 ? 's' : ''}` : null,
              ].filter(Boolean).map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleEnroll}
              disabled={enrollMutation.isPending}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enrollMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                `Acheter — ${formatPrice(formation.price)}`
              )}
            </button>

            {/* Preview gratuit */}
            {freeVideos.length > 0 && (
              <button
                onClick={() => router.push(
                  `/formations/${slug}/lecteur?videoId=${freeVideos[0].id}&formationId=${formation.id}`
                )}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ▶ Voir la leçon gratuite
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
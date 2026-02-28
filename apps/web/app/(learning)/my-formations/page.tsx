'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface VideoProgress {
  videoId: string;
  title: string;
  isCompleted: boolean;
  watchedSec: number;
}

interface MyFormation {
  formation: {
    id: string;
    slug: string;
    title: string;
    level: string;
    price: number;
    durationMin: number;
  };
  enrolledAt: string;
  completedAt: string | null;
  progressPct: number;
  videosProgress: VideoProgress[];
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(amount);

const levelLabels: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
};

export default function MyFormationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-formations');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: myFormations, isLoading } = useQuery({
    queryKey: ['my-formations'],
    queryFn: async () => {
      const { data } = await api.get<MyFormation[]>('/my-formations');
      return data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Formations</h1>
          <p className="text-gray-500 mt-1">Vos formations achetées et votre progression</p>
        </div>
        <Link
          href="/formations"
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Découvrir d&apos;autres formations
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && myFormations?.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🎬</span>
          <p className="text-lg font-medium text-gray-700">
            Vous n&apos;avez pas encore de formation
          </p>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Découvrez notre catalogue de formations professionnelles
          </p>
          <Link
            href="/formations"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Voir les formations
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {myFormations?.map((item) => {
          const completedVideos = item.videosProgress.filter((v) => v.isCompleted).length;
          const totalVideos     = item.videosProgress.length;

          return (
            <div
              key={item.formation.id}
              className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {item.formation.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {levelLabels[item.formation.level] ?? item.formation.level}
                    </span>
                    <span className="text-xs text-gray-400">
                      Acheté le {new Date(item.enrolledAt).toLocaleDateString('fr-SN')}
                    </span>
                    {item.completedAt && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        ✓ Complété
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/formations/${item.formation.slug}/lecteur?formationId=${item.formation.id}`}
                  className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  ▶ Continuer
                </Link>
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {completedVideos}/{totalVideos} leçons complétées
                  </span>
                  <span className="font-semibold text-gray-900">
                    {item.progressPct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.progressPct === 100 ? 'bg-green-500' : 'bg-gray-900'
                    }`}
                    style={{ width: `${item.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Détail vidéos */}
              {item.videosProgress.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {item.videosProgress.map((vp, i) => (
                    <div
                      key={vp.videoId}
                      className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${
                        vp.isCompleted
                          ? 'bg-green-50 text-green-700'
                          : vp.watchedSec > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span>{vp.isCompleted ? '✓' : vp.watchedSec > 0 ? '▶' : '○'}</span>
                      <span className="truncate">{i + 1}. {vp.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import VideoPlayer from '@/components/learning/VideoPlayer';
import { useAuthStore } from '@/lib/store/auth.store';

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
  videos: Video[];
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
};

export default function LecteurPage() {
  const { slug }        = useParams<{ slug: string }>();
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const { isAuthenticated } = useAuthStore();

  const initialVideoId  = searchParams.get('videoId')     ?? '';
  const formationId     = searchParams.get('formationId') ?? '';

  const [activeVideoId, setActiveVideoId] = useState(initialVideoId);
  const [completedIds,  setCompletedIds]  = useState<Set<string>>(new Set());

  // Charger la formation
  const { data: formation } = useQuery({
    queryKey: ['formation-lecteur', slug],
    queryFn: async () => {
      const { data } = await api.get<FormationDetail>(`/formations/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const activeVideo = formation?.videos.find((v) => v.id === activeVideoId);

  // Rediriger si non connecté
  if (!isAuthenticated) {
    return (
      <div className="text-center py-16 space-y-4">
        <span className="text-5xl block">🔒</span>
        <p className="text-lg font-medium text-gray-700">
          Connexion requise pour accéder au lecteur
        </p>
        <button
          onClick={() => router.push(`/login?redirect=/formations/${slug}/lecteur?videoId=${activeVideoId}&formationId=${formationId}`)}
          className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/formations" className="hover:text-gray-900">Formations</Link>
        <span>›</span>
        <Link href={`/formations/${slug}`} className="hover:text-gray-900">
          {formation?.title ?? slug}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Lecteur</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Lecteur vidéo */}
        <div className="lg:col-span-2">
          {activeVideo ? (
            <VideoPlayer
              videoId={activeVideo.id}
              formationId={formationId || formation?.id || ''}
              title={activeVideo.title}
              durationSec={activeVideo.durationSec}
              onComplete={() => {
                setCompletedIds((prev) => new Set([...Array.from(prev), activeVideo.id]));
              }}
            />
          ) : (
            <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center">
              <p className="text-white text-sm">Sélectionnez une leçon</p>
            </div>
          )}

          {/* Description vidéo active */}
          {activeVideo?.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700 text-sm">{activeVideo.description}</p>
            </div>
          )}
        </div>

        {/* Playlist */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Leçons du cours</h2>
              {formation && (
                <p className="text-xs text-gray-500 mt-1">
                  {formation.videos.length} leçons •{' '}
                  {completedIds.size}/{formation.videos.length} complétées
                </p>
              )}
              {/* Barre de progression globale */}
              {formation && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${formation.videos.length > 0
                        ? (completedIds.size / formation.videos.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {formation?.videos.map((video, i) => {
                const isActive    = video.id === activeVideoId;
                const isCompleted = completedIds.has(video.id);

                return (
                  <button
                    key={video.id}
                    onClick={() => setActiveVideoId(video.id)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Numéro / état */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-white text-gray-900'
                        : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isCompleted && !isActive ? '✓' : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? 'text-white' : 'text-gray-900'
                      }`}>
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${
                          isActive ? 'text-gray-300' : 'text-gray-400'
                        }`}>
                          {formatDuration(video.durationSec)}
                        </span>
                        {video.isFreePreview && (
                          <span className={`text-xs ${
                            isActive ? 'text-green-300' : 'text-green-600'
                          }`}>
                            Gratuit
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
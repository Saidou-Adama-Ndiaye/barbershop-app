'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
interface Formation {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  level: 'debutant' | 'intermediaire' | 'avance';
  language: string;
  durationMin: number;
  totalEnrolled: number;
  avgRating: number;
  tags: string[];
  thumbnailUrl: string;
  instructor: { firstName: string; lastName: string };
}

interface FormationsResponse {
  data: Formation[];
  total: number;
  page: number;
  limit: number;
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(amount);

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

const levelConfig = {
  debutant:      { label: 'Débutant',      color: 'bg-green-100 text-green-800'  },
  intermediaire: { label: 'Intermédiaire', color: 'bg-blue-100 text-blue-800'    },
  avance:        { label: 'Avancé',        color: 'bg-purple-100 text-purple-800' },
};

// ─── Composant FormationCard ──────────────────────────────
function FormationCard({ formation }: { formation: Formation }) {
  const router  = useRouter();
  const level   = levelConfig[formation.level];

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
      onClick={() => router.push(`/formations/${formation.slug}`)}
    >
      {/* Thumbnail */}
      <div className="h-44 bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center relative">
        {formation.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={formation.thumbnailUrl}
            alt={formation.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">🎬</span>
        )}
        {/* Badge niveau */}
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${level.color}`}>
            {level.label}
          </span>
        </div>
        {/* Durée */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
          {formatDuration(formation.durationMin)}
        </div>
      </div>

      {/* Contenu */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2">
          {formation.title}
        </h3>

        {formation.description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3 flex-1">
            {formation.description}
          </p>
        )}

        {/* Instructeur */}
        <p className="text-xs text-gray-400 mb-3">
          Par {formation.instructor?.firstName} {formation.instructor?.lastName}
        </p>

        {/* Tags */}
        {formation.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {formation.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(formation.price)}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {formation.totalEnrolled > 0 && (
              <span>👥 {formation.totalEnrolled}</span>
            )}
            {formation.avgRating && (
              <span>⭐ {Number(formation.avgRating).toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function FormationsPage() {
  const [level,    setLevel]    = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [page,     setPage]     = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['formations', level, maxPrice, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 9 };
      if (level)    params.level    = level;
      if (maxPrice) params.maxPrice = maxPrice;
      const { data } = await api.get<FormationsResponse>('/formations', { params });
      return data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleLevelChange = (l: string) => {
    setLevel(l === level ? '' : l);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Formations E-learning</h1>
        <p className="text-gray-500 mt-1">
          Développez vos compétences avec nos formations vidéo professionnelles
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Niveau */}
        <div className="flex gap-2">
          {Object.entries(levelConfig).map(([key, val]) => (
            <button
              key={key}
              onClick={() => handleLevelChange(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                level === key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>

        {/* Prix max */}
        <select
          value={maxPrice}
          onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
          className="px-4 py-2 rounded-full text-sm border border-gray-200 bg-white text-gray-600 outline-none"
        >
          <option value={0}>Tous les prix</option>
          <option value={15000}>≤ 15 000 XOF</option>
          <option value={20000}>≤ 20 000 XOF</option>
          <option value={35000}>≤ 35 000 XOF</option>
        </select>

        {/* Reset */}
        {(level || maxPrice > 0) && (
          <button
            onClick={() => { setLevel(''); setMaxPrice(0); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-700 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Erreur */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger les formations. Vérifiez que l&apos;API est démarrée.
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Grille */}
      {data && (
        <>
          <div className="text-sm text-gray-500">
            {data.total} formation{data.total > 1 ? 's' : ''} trouvée{data.total > 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((f) => (
              <FormationCard key={f.id} formation={f} />
            ))}
          </div>
        </>
      )}

      {/* Vide */}
      {!isLoading && data?.data.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🎬</span>
          <p className="text-lg font-medium text-gray-700">Aucune formation trouvée</p>
          <p className="text-sm text-gray-500 mt-1">Essayez d&apos;autres filtres</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PackCard, { PackCardProps } from '@/components/shop/PackCard';
import SkeletonCard from '@/components/ui/SkeletonCard';

// ─── Types ────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PacksResponse {
  data: PackCardProps[];
  total: number;
  page: number;
  limit: number;
}

// ─── Fetchers ─────────────────────────────────────────────
const fetchPacks = async (category?: string, page = 1): Promise<PacksResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: '9' });
  if (category) params.set('category', category);
  const { data } = await api.get<PacksResponse>(`/packs?${params}`);
  return data;
};

const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await api.get<Category[]>('/categories');
  return data;
};

// ─── Composant ────────────────────────────────────────────
export default function PacksPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Fetch catégories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Fetch packs
  const { data: packsData, isLoading, isError } = useQuery({
    queryKey: ['packs', selectedCategory, page],
    queryFn: () => fetchPacks(selectedCategory, page),
  });

  const totalPages = packsData ? Math.ceil(packsData.total / packsData.limit) : 0;

  // ─── Handler filtre catégorie ────────────────────────
  const handleCategoryChange = (slug?: string) => {
    setSelectedCategory(slug);
    setPage(1); // reset pagination
  };

  return (
    <div className="space-y-8">

      {/* En-tête page */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nos Packs</h1>
        <p className="text-gray-500 mt-1">
          Des packs professionnels conçus pour les coiffeurs de la zone UEMOA
        </p>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleCategoryChange(undefined)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
          }`}
        >
          Tous
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.slug
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger les packs. Vérifiez que l&apos;API est démarrée sur le port 3000.
        </div>
      )}

      {/* Grille packs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : packsData?.data.map((pack) => (
              <PackCard key={pack.id} {...pack} />
            ))}
      </div>

      {/* Aucun résultat */}
      {!isLoading && packsData?.data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-4">📦</span>
          <p className="text-lg font-medium">Aucun pack trouvé</p>
          <p className="text-sm mt-1">Essayez une autre catégorie</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}